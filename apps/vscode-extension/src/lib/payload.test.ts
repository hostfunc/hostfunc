import { describe, expect, it } from "vitest";
import { parsePayload, validatePayloadInput } from "./payload.js";

describe("parsePayload", () => {
  it("treats empty / whitespace input as an empty object", () => {
    expect(parsePayload("")).toEqual({});
    expect(parsePayload("   ")).toEqual({});
  });

  it("parses a JSON object", () => {
    expect(parsePayload('{"name":"world","n":2}')).toEqual({ name: "world", n: 2 });
  });

  it("rejects invalid JSON", () => {
    expect(() => parsePayload("{not json}")).toThrow(/not valid JSON/);
  });

  it("rejects non-object JSON (arrays, primitives, null)", () => {
    expect(() => parsePayload("[1,2]")).toThrow(/must be a JSON object/);
    expect(() => parsePayload('"hi"')).toThrow(/must be a JSON object/);
    expect(() => parsePayload("42")).toThrow(/must be a JSON object/);
    expect(() => parsePayload("null")).toThrow(/must be a JSON object/);
  });
});

describe("validatePayloadInput", () => {
  it("returns undefined for valid input", () => {
    expect(validatePayloadInput("{}")).toBeUndefined();
    expect(validatePayloadInput("")).toBeUndefined();
  });

  it("returns an error message for invalid input", () => {
    expect(validatePayloadInput("[1]")).toMatch(/must be a JSON object/);
    expect(validatePayloadInput("oops")).toMatch(/not valid JSON/);
  });
});
