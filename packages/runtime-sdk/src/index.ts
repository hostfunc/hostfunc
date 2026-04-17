import { fn } from "./core/fn";
import { secret } from "./core/secret";

export type { FnApi } from "./core/fn";
export type { SecretApi } from "./core/secret";
export type {
  ExecuteFunctionOptions,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  RuntimeContext,
} from "./core/types";
export { SdkError } from "./core/types";

export default fn;
export { fn, secret };
