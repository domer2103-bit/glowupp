import { z } from "zod";

/**
 * The registry of supported project categories and their question sets.
 *
 * This is the mechanism described in docs/BACKEND_ARCHITECTURE.md §4: adding
 * a new category (e.g. "Loft conversion") means adding an entry here, not
 * migrating the database. `Project.projectType` and
 * `ProfessionalService.projectType` both store a `key` from this registry,
 * validated against `PROJECT_TYPE_KEYS` at the application layer.
 *
 * Every field is optional in the derived Zod schema on purpose — the
 * GlowUpp AI assistant (Phase 4) fills these in incrementally over a
 * conversation and explicitly marks what's still unknown rather than
 * requiring a complete form upfront. `required` below is a UI/prompting
 * hint (which fields the assistant should prioritize asking about), not a
 * validation constraint.
 */

export type FieldType = "text" | "textarea" | "select" | "multiselect" | "number" | "boolean";

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  options?: readonly string[];
  required?: boolean;
}

export interface ProjectTypeDefinition {
  key: string;
  label: string;
  fields: readonly FieldDefinition[];
}

function fieldToZod(field: FieldDefinition): z.ZodTypeAny {
  switch (field.type) {
    case "number":
      return z.number();
    case "boolean":
      return z.boolean();
    case "select":
      return z.enum(field.options as [string, ...string[]]);
    case "multiselect":
      return z.array(z.enum(field.options as [string, ...string[]]));
    case "text":
    case "textarea":
    default:
      return z.string();
  }
}

/**
 * Builds the Zod schema for a project type's `ProjectRequirements.data`
 * JSON. Uses `.strict()` deliberately: an unrecognized key (a typo, or a
 * field from the wrong project type) should fail loudly rather than being
 * silently dropped — this data is meant to be a trustworthy structured
 * record, not a best-effort bag of whatever the AI assistant wrote.
 */
export function schemaForProjectType(definition: ProjectTypeDefinition) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of definition.fields) {
    shape[field.key] = fieldToZod(field).optional().nullable();
  }
  return z.object(shape).partial().strict();
}

const KITCHEN: ProjectTypeDefinition = {
  key: "kitchen",
  label: "Kitchen",
  fields: [
    { key: "currentLayout", label: "Current layout", type: "textarea" },
    { key: "desiredStyle", label: "Desired style", type: "text", required: true },
    { key: "cabinets", label: "Cabinets", type: "text" },
    { key: "worktop", label: "Worktop", type: "text" },
    { key: "appliances", label: "Appliances", type: "multiselect", options: ["oven", "hob", "extractor", "fridge_freezer", "dishwasher", "washing_machine", "microwave"] },
    { key: "island", label: "Island", type: "boolean" },
    { key: "flooring", label: "Flooring", type: "text" },
    { key: "lighting", label: "Lighting", type: "text" },
    { key: "storage", label: "Storage", type: "textarea" },
    { key: "mustHaveFeatures", label: "Must-have features", type: "textarea", required: true },
  ],
};

const BATHROOM: ProjectTypeDefinition = {
  key: "bathroom",
  label: "Bathroom",
  fields: [
    { key: "bathOrShower", label: "Bath / shower", type: "select", options: ["bath", "shower", "both"] },
    { key: "vanity", label: "Vanity", type: "text" },
    { key: "toilet", label: "Toilet", type: "text" },
    { key: "tiles", label: "Tiles", type: "text" },
    { key: "storage", label: "Storage", type: "textarea" },
    { key: "lighting", label: "Lighting", type: "text" },
    { key: "style", label: "Style", type: "text", required: true },
    { key: "colours", label: "Colours", type: "text" },
  ],
};

const DRIVEWAY: ProjectTypeDefinition = {
  key: "driveway",
  label: "Driveway",
  fields: [
    { key: "currentSurface", label: "Current surface", type: "text" },
    { key: "desiredMaterial", label: "Desired material", type: "select", options: ["block_paving", "resin", "gravel", "tarmac", "concrete", "natural_stone"] },
    { key: "colour", label: "Colour", type: "text" },
    { key: "parkingSpaces", label: "Parking spaces", type: "number", required: true },
    { key: "drainage", label: "Drainage", type: "text" },
    { key: "edging", label: "Edging", type: "text" },
    { key: "gates", label: "Gates", type: "boolean" },
  ],
};

const GARDEN: ProjectTypeDefinition = {
  key: "garden",
  label: "Garden / Backyard",
  fields: [
    { key: "patio", label: "Patio", type: "boolean" },
    { key: "lawn", label: "Lawn", type: "boolean" },
    { key: "planting", label: "Planting", type: "textarea" },
    { key: "fencing", label: "Fencing", type: "text" },
    { key: "lighting", label: "Lighting", type: "text" },
    { key: "seating", label: "Seating", type: "text" },
    { key: "storage", label: "Storage", type: "text" },
    { key: "style", label: "Style", type: "text", required: true },
    { key: "maintenancePreference", label: "Maintenance preference", type: "select", options: ["low", "medium", "high"] },
  ],
};

const PATIO: ProjectTypeDefinition = {
  key: "patio",
  label: "Patio",
  fields: [
    { key: "currentSurface", label: "Current surface", type: "text" },
    { key: "desiredMaterial", label: "Desired material", type: "select", options: ["natural_stone", "porcelain", "block_paving", "concrete", "decking"] },
    { key: "approxSizeSqm", label: "Approximate size (sqm)", type: "number" },
    { key: "seating", label: "Seating", type: "text" },
    { key: "lighting", label: "Lighting", type: "text" },
    { key: "drainage", label: "Drainage", type: "text" },
    { key: "style", label: "Style", type: "text", required: true },
  ],
};

const EXTERIOR: ProjectTypeDefinition = {
  key: "exterior",
  label: "Exterior / House frontage",
  fields: [
    { key: "currentFinish", label: "Current finish (render, brick, cladding...)", type: "text" },
    { key: "desiredFinish", label: "Desired finish", type: "text", required: true },
    { key: "frontDoor", label: "Front door", type: "text" },
    { key: "windows", label: "Windows", type: "text" },
    { key: "lighting", label: "Lighting", type: "text" },
    { key: "planting", label: "Planting", type: "text" },
    { key: "style", label: "Style", type: "text" },
  ],
};

/** The live registry. Add a new category by adding an entry here. */
export const PROJECT_TYPES: readonly ProjectTypeDefinition[] = [
  KITCHEN,
  BATHROOM,
  GARDEN,
  DRIVEWAY,
  PATIO,
  EXTERIOR,
];

export const PROJECT_TYPE_KEYS = PROJECT_TYPES.map((t) => t.key) as [string, ...string[]];

const registryByKey = new Map(PROJECT_TYPES.map((t) => [t.key, t]));

export function getProjectTypeDefinition(key: string): ProjectTypeDefinition | undefined {
  return registryByKey.get(key);
}

export function isValidProjectType(key: string): boolean {
  return registryByKey.has(key);
}

/** Whether a requirements field's value counts as "filled in" — shared by the assistant's known/missing tracking (src/lib/assistant.ts) and the pre-quote-request validation (src/lib/actions/quotes.ts), so the two never disagree about what "known" means. */
export function isFieldValueSet(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0);
}

/** Validates a `ProjectRequirements.data` payload against its project type's schema. */
export function validateRequirementsData(projectType: string, data: unknown) {
  const definition = getProjectTypeDefinition(projectType);
  if (!definition) {
    throw new Error(`Unknown project type: ${projectType}`);
  }
  return schemaForProjectType(definition).parse(data);
}
