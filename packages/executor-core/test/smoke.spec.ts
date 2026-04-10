import { describe, expect, it } from "vitest";
import { HostFuncError } from "../src/errors.js";

describe("executor-core smoke", () => {
  it("serializes HostFuncError", () => {
    const err = new HostFuncError("INFRA_EXECUTE_FAILED", "boom");

    expect(err.name).toBe("HostFuncError");
    expect(err.toJSON()).toEqual({
      name: "HostFuncError",
      code: "INFRA_EXECUTE_FAILED",
      message: "boom",
    });
  });
});
