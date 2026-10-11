import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { isFieldValueSet, type FieldDefinition, type ProjectTypeDefinition } from "@/lib/project-types";
import { penceToPounds } from "@/lib/money";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-5";
const MAX_HISTORY_MESSAGES = 20;

/**
 * Fields the assistant can also update that live on `Project` itself, not
 * in the per-type `ProjectRequirements.data` JSON. Kept as a single
 * source of truth here so the tool schema, the prompt, and the action
 * layer that splits the AI's response into "write to Project" vs. "write
 * to requirements" all agree on the same reserved key list.
 */
export const PROJECT_LEVEL_FIELDS: readonly FieldDefinition[] = [
  { key: "budgetMin", label: "Minimum budget in GBP pounds", type: "number" },
  { key: "budgetMax", label: "Maximum budget in GBP pounds", type: "number" },
  { key: "targetStartDate", label: "Target start date, as an ISO date YYYY-MM-DD", type: "text" },
];
export const PROJECT_LEVEL_FIELD_KEYS = PROJECT_LEVEL_FIELDS.map((f) => f.key);

export interface ProfileStatus {
  knownFields: FieldDefinition[];
  missingFields: FieldDefinition[];
}

/**
 * Deterministic, not AI-judged: "known" vs. "missing" is computed by
 * comparing the type's field registry against what's actually stored,
 * because the brief's "know what's already collected" requirement is too
 * important to trust to the model's own bookkeeping.
 */
export function computeProfileStatus(definition: ProjectTypeDefinition, data: Record<string, unknown>): ProfileStatus {
  const knownFields: FieldDefinition[] = [];
  const missingFields: FieldDefinition[] = [];
  for (const field of definition.fields) {
    const isKnown = isFieldValueSet(data[field.key]);
    (isKnown ? knownFields : missingFields).push(field);
  }
  return { knownFields, missingFields };
}

function fieldToJsonSchemaProperty(field: FieldDefinition): Record<string, unknown> {
  switch (field.type) {
    case "number":
      return { type: "number", description: field.label };
    case "boolean":
      return { type: "boolean", description: field.label };
    case "select":
      return { type: "string", enum: field.options, description: field.label };
    case "multiselect":
      return {
        type: "array",
        items: { type: "string", enum: field.options },
        description: `${field.label} — include the complete list now known, not just newly mentioned items.`,
      };
    default:
      return { type: "string", description: field.label };
  }
}

/** Present in the tool only once the homeowner has a chosen design: a short instruction for the image editor, set only when they ask to change how the design looks. */
export const DESIGN_CHANGE_KEY = "designChange";

export function buildTool(definition: ProjectTypeDefinition, opts: { canChangeDesign?: boolean } = {}): Anthropic.Tool {
  const properties: Record<string, unknown> = {
    reply: {
      type: "string",
      description:
        "Your natural-language response to show the homeowner — an acknowledgment and/or your next question. Plain, friendly, concise: one or two sentences.",
    },
  };
  for (const field of definition.fields) properties[field.key] = fieldToJsonSchemaProperty(field);
  for (const field of PROJECT_LEVEL_FIELDS) properties[field.key] = fieldToJsonSchemaProperty(field);
  if (opts.canChangeDesign) {
    properties[DESIGN_CHANGE_KEY] = {
      type: "string",
      description:
        "ONLY when the homeowner asks to change how their chosen design looks: one clear instruction for an image editor, describing just the change(s) they asked for (e.g. \"Change the worktop to dark grey stone and add pendant lights over the island\"). Leave out entirely for questions, unclear requests, or anything that is not a visual change.",
    };
  }

  return {
    name: "respond_and_update_profile",
    description:
      "Reply to the homeowner and record any new or corrected information they just gave you. Only include a field if you are confident about it from what was actually said in this conversation — never guess, assume, or invent a value.",
    input_schema: { type: "object", properties, required: ["reply"] },
  };
}

interface ProjectContext {
  title: string;
  description: string | null;
  postcode: string;
  budgetMin: number | null;
  budgetMax: number | null;
  targetStartDate: Date | null;
}

function buildSystemPrompt(project: ProjectContext, definition: ProjectTypeDefinition, status: ProfileStatus): string {
  const known = status.knownFields.map((f) => `- ${f.label}`).join("\n") || "(nothing yet)";
  const missing =
    status.missingFields.map((f) => `- ${f.label}${f.required ? " (important)" : ""}`).join("\n") || "(nothing — the brief is complete)";

  const budget =
    project.budgetMin || project.budgetMax
      ? `£${project.budgetMin ? penceToPounds(project.budgetMin) : "?"}–£${project.budgetMax ? penceToPounds(project.budgetMax) : "?"}`
      : "not set";

  return `You are the GlowUpp project assistant. Your ONLY job is to turn a homeowner's informal description of a home improvement idea into a structured project brief for a ${definition.label.toLowerCase()} project. You are not a general-purpose chatbot, and you don't discuss anything unrelated to this project.

Ground rules:
- Never invent or assume a fact the homeowner hasn't actually told you. If something is still unknown, leave it out of your update — do not guess a plausible-sounding value.
- Don't re-ask about something already known (see "Already known" below) unless the homeowner's latest message seems to contradict it — in that case, ask them to confirm which is correct instead of silently overwriting it.
- Prioritize asking about "Still needed" items, especially ones marked (important), over nice-to-have details.
- Keep replies short and conversational: one or two sentences, at most one follow-up question per turn.
- When you update a multi-select field (like appliances), include the COMPLETE list of everything now known for it, not just what was newly mentioned this turn.
- You must always call the respond_and_update_profile tool. Never invent a field name that isn't in its schema.

Already known about this project:
${known}

Still needed:
${missing}

Project so far: "${project.title}" — ${project.description ?? "no description yet"}. Postcode ${project.postcode}. Budget: ${budget}. Target start date: ${project.targetStartDate ? project.targetStartDate.toISOString().slice(0, 10) : "not set"}.`;
}

/** The prompt once the homeowner has a chosen design: the job is now helping them change it, not collecting a brief. */
export function buildDesignChangePrompt(project: ProjectContext, definition: ProjectTypeDefinition, status: ProfileStatus, styleLabel?: string): string {
  const known = status.knownFields.map((f) => `- ${f.label}`).join("\n") || "(nothing)";
  return `You are the GlowUpp design assistant. The homeowner has chosen an AI-generated design${styleLabel ? ` (${styleLabel} style)` : ""} for their ${definition.label.toLowerCase()} project "${project.title}" and may now ask you to change it. You are not a general-purpose chatbot and don't discuss anything unrelated to this project.

How to respond:
- If they ask to change how the design looks (colours, materials, fittings, lighting, furniture, finishes, layout of items), set ${DESIGN_CHANGE_KEY} to one clear instruction covering exactly what they asked for — nothing extra — and reply in one or two friendly sentences saying what you are changing and that the new version appears on their page in about a minute or two.
- If they ask a question, their request is unclear, or it is not about the design, reply briefly (ask at most one short question) and leave ${DESIGN_CHANGE_KEY} out.
- Never promise prices, timescales or particular tradespeople.
- Never invent a fact they haven't told you. Only fill in a brief field when you are confident from what was actually said.
- You must always call the respond_and_update_profile tool.

Details already recorded for this project:
${known}`;
}

export interface AssistantTurnResult {
  reply: string;
  updates: Record<string, unknown>;
  /** Set only in design mode, when the homeowner asked for a visual change. */
  designChange?: string;
}

export async function runAssistantTurn(params: {
  project: ProjectContext;
  definition: ProjectTypeDefinition;
  requirementsData: Record<string, unknown>;
  history: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
  /** Set once a design is chosen: switches to helping change that design. */
  design?: { styleLabel?: string };
}): Promise<AssistantTurnResult> {
  const status = computeProfileStatus(params.definition, params.requirementsData);
  const system = params.design
    ? buildDesignChangePrompt(params.project, params.definition, status, params.design.styleLabel)
    : buildSystemPrompt(params.project, params.definition, status);
  const tool = buildTool(params.definition, { canChangeDesign: !!params.design });
  const trimmedHistory = params.history.slice(-MAX_HISTORY_MESSAGES);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [
      ...trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: params.userMessage },
    ],
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
  });

  const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
  if (!toolUse) throw new Error("Assistant did not return a structured response.");

  const input = toolUse.input as Record<string, unknown>;
  const { reply, [DESIGN_CHANGE_KEY]: rawChange, ...updates } = input;
  if (typeof reply !== "string") throw new Error("Assistant response was missing reply text.");
  const designChange = params.design && typeof rawChange === "string" && rawChange.trim() ? rawChange.trim() : undefined;

  return { reply, updates, designChange };
}
