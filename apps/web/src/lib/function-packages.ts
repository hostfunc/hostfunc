export const DEFAULT_FUNCTION_SDK = "@hostfunc/sdk";

export interface FunctionPackageRecord {
  name: string;
  version: string | null;
  source: "default" | "auto" | "manual";
  updatedAt: string;
}
