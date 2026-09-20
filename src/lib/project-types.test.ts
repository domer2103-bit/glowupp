import { describe, it, expect } from "vitest";
import {
  isFieldValueSet,
  validateRequirementsData,
  getProjectTypeDefinition,
  isValidProjectType,
  PROJECT_TYPE_KEYS,
} from "./project-types";

describe("isFieldValueSet", () => {
  it("treats undefined, null, and empty string as not set", () => {
    expect(isFieldValueSet(undefined)).toBe(false);
    expect(isFieldValueSet(null)).toBe(false);
    expect(isFieldValueSet("")).toBe(false);
  });

  it("treats an empty array as not set", () => {
    expect(isFieldValueSet([])).toBe(false);
  });

  it("treats a non-empty array as set", () => {
    expect(isFieldValueSet(["oven"])).toBe(true);
  });

  it("treats falsy-but-meaningful values as set", () => {
    expect(isFieldValueSet(0)).toBe(true);
    expect(isFieldValueSet(false)).toBe(true);
  });

  it("treats a non-empty string as set", () => {
    expect(isFieldValueSet("Modern")).toBe(true);
  });
});

describe("getProjectTypeDefinition / isValidProjectType", () => {
  it("finds a registered project type", () => {
    expect(getProjectTypeDefinition("kitchen")?.label).toBe("Kitchen");
    expect(isValidProjectType("kitchen")).toBe(true);
  });

  it("returns undefined/false for an unregistered type", () => {
    expect(getProjectTypeDefinition("spaceship")).toBeUndefined();
    expect(isValidProjectType("spaceship")).toBe(false);
  });

  it("PROJECT_TYPE_KEYS lists every registered type's key", () => {
    expect(PROJECT_TYPE_KEYS).toContain("kitchen");
    expect(PROJECT_TYPE_KEYS).toContain("bathroom");
    expect(PROJECT_TYPE_KEYS).toContain("driveway");
  });
});

describe("validateRequirementsData", () => {
  it("accepts a valid partial kitchen payload", () => {
    const result = validateRequirementsData("kitchen", { desiredStyle: "Modern", island: true });
    expect(result).toEqual({ desiredStyle: "Modern", island: true });
  });

  it("accepts an empty payload — every field is optional at the schema level", () => {
    expect(validateRequirementsData("kitchen", {})).toEqual({});
  });

  it("throws on an unrecognized field instead of silently dropping it", () => {
    expect(() => validateRequirementsData("kitchen", { notARealField: "x" })).toThrow();
  });

  it("throws on a field from the wrong project type", () => {
    // "bathOrShower" belongs to the bathroom schema, not kitchen.
    expect(() => validateRequirementsData("kitchen", { bathOrShower: "bath" })).toThrow();
  });

  it("throws for an unknown project type", () => {
    expect(() => validateRequirementsData("spaceship", {})).toThrow("Unknown project type");
  });
});
