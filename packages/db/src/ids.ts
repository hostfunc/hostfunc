import { ulid } from "ulid";

export type IdPrefix =
  | "usr"
  | "org"
  | "mem"
  | "inv"
  | "fn"
  | "ver"
  | "drf"
  | "trg"
  | "sec"
  | "exe"
  | "log"
  | "sub"
  | "pln"
  | "use"
  | "tok";

export function genId(prefix: IdPrefix): string {
  return `${prefix}_${ulid()}`;
}
