import { beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create: sdk.create }; } }));

import { buildTool, DESIGN_CHANGE_KEY, runAssistantTurn } from "@/lib/assistant";
import { getProjectTypeDefinition } from "@/lib/project-types";

const definition = getProjectTypeDefinition("kitchen")!;
const project = { title: "Kitchen redesign", description: null, postcode: "L1 2AB", budgetMin: null, budgetMax: null, targetStartDate: null };

function toolReply(input: Record<string, unknown>) {
  sdk.create.mockResolvedValueOnce({ content: [{ type: "tool_use", name: "respond_and_update_profile", input }] });
}

function params(design?: { styleLabel?: string }) {
  return { project, definition, requirementsData: {}, history: [], userMessage: "Make the worktop darker", design };
}

describe("assistant tool", () => {
  it("offers a design change only once there is a chosen design", () => {
    const props = (opts: { canChangeDesign?: boolean }) => (buildTool(definition, opts).input_schema.properties as Record<string, unknown>);
    expect(props({})).not.toHaveProperty(DESIGN_CHANGE_KEY);
    expect(props({ canChangeDesign: true })).toHaveProperty(DESIGN_CHANGE_KEY);
  });
});

describe("runAssistantTurn", () => {
  beforeEach(() => sdk.create.mockReset());

  it("returns the requested design change and keeps it out of the brief updates", async () => {
    toolReply({ reply: "On it!", [DESIGN_CHANGE_KEY]: "  Make the worktop dark grey stone ", budgetMax: 9000 });
    const result = await runAssistantTurn(params({ styleLabel: "Bold" }));
    expect(result.designChange).toBe("Make the worktop dark grey stone");
    expect(result.updates).toEqual({ budgetMax: 9000 });
    const call = sdk.create.mock.calls[0][0];
    expect(call.system).toContain("Bold style");
    expect(call.system).not.toContain("Still needed");
  });

  it("ignores a design change when no design is chosen (brief mode)", async () => {
    toolReply({ reply: "Tell me more.", [DESIGN_CHANGE_KEY]: "Make it darker" });
    const result = await runAssistantTurn(params());
    expect(result.designChange).toBeUndefined();
    expect(sdk.create.mock.calls[0][0].system).toContain("Still needed");
  });

  it("treats a blank change as none", async () => {
    toolReply({ reply: "Which worktop?", [DESIGN_CHANGE_KEY]: "   " });
    expect((await runAssistantTurn(params({}))).designChange).toBeUndefined();
  });
});
