type JsonLike =
  | string
  | number
  | boolean
  | null
  | JsonLike[]
  | { [key: string]: JsonLike };

const SIMPLE_TYPE_MAP: Record<string, JsonLike> = {
  string: "test_value",
  number: 123,
  boolean: true,
  unknown: "test_value",
  any: "test_value",
};

function splitTopLevel(source: string, separator: string): string[] {
  const out: string[] = [];
  let depthCurly = 0;
  let depthSquare = 0;
  let depthParen = 0;
  let current = "";
  for (const ch of source) {
    if (ch === "{") depthCurly += 1;
    if (ch === "}") depthCurly = Math.max(0, depthCurly - 1);
    if (ch === "[") depthSquare += 1;
    if (ch === "]") depthSquare = Math.max(0, depthSquare - 1);
    if (ch === "(") depthParen += 1;
    if (ch === ")") depthParen = Math.max(0, depthParen - 1);
    if (ch === separator && depthCurly === 0 && depthSquare === 0 && depthParen === 0) {
      if (current.trim()) out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function parseType(typeText: string): JsonLike {
  const type = typeText.trim().replace(/\s+/g, " ");
  if (type.endsWith("[]")) {
    const inner = type.slice(0, -2).trim();
    return [parseType(inner)];
  }
  const primitive = SIMPLE_TYPE_MAP[type];
  if (primitive !== undefined) return primitive;
  if (type.startsWith("Array<") && type.endsWith(">")) {
    return [parseType(type.slice(6, -1))];
  }
  if (type.includes("|")) {
    const first = splitTopLevel(type, "|")[0] ?? "string";
    return parseType(first);
  }
  if (type.startsWith("{") && type.endsWith("}")) {
    return parseObjectType(type.slice(1, -1));
  }
  if (/^Record<\s*string\s*,\s*.+>$/.test(type)) {
    return { key: "value" };
  }
  return "test_value";
}

function parseObjectType(body: string): JsonLike {
  const entries = splitTopLevel(body, ";").flatMap((part) => splitTopLevel(part, ","));
  const obj: Record<string, JsonLike> = {};
  for (const raw of entries) {
    const line = raw.trim();
    if (!line) continue;
    const match = line.match(/^([a-zA-Z0-9_]+)\??\s*:\s*(.+)$/);
    if (!match) continue;
    const [, key, valueType] = match;
    if (!key || !valueType) continue;
    obj[key] = parseType(valueType);
  }
  return obj;
}

function findInlineInputType(code: string): string | null {
  const inline = code.match(/main\s*\(\s*input\s*:\s*(\{[\s\S]*?\})\s*\)/m);
  return inline?.[1] ?? null;
}

function findNamedInputTypeName(code: string): string | null {
  const named = code.match(/main\s*\(\s*input\s*:\s*([A-Za-z0-9_]+)\s*\)/m);
  return named?.[1] ?? null;
}

function findNamedTypeDefinition(code: string, typeName: string): string | null {
  const iface = code.match(new RegExp(`interface\\s+${typeName}\\s*\\{([\\s\\S]*?)\\}`, "m"));
  if (iface?.[1]) return `{${iface[1]}}`;
  const alias = code.match(new RegExp(`type\\s+${typeName}\\s*=\\s*(\\{[\\s\\S]*?\\})`, "m"));
  if (alias?.[1]) return alias[1];
  return null;
}

export function inferPayloadStatic(code: string): {
  ok: boolean;
  payload: Record<string, JsonLike>;
  reason?: string;
} {
  const inlineType = findInlineInputType(code);
  if (inlineType) {
    const payload = parseType(inlineType);
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      return { ok: true, payload: payload as Record<string, JsonLike> };
    }
  }

  const typeName = findNamedInputTypeName(code);
  if (typeName) {
    const def = findNamedTypeDefinition(code, typeName);
    if (def) {
      const payload = parseType(def);
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        return { ok: true, payload: payload as Record<string, JsonLike> };
      }
    }
  }

  return { ok: false, payload: {}, reason: "no_parseable_input_shape" };
}

export function parsePayloadCandidate(candidate: string): {
  ok: boolean;
  payload: Record<string, JsonLike>;
  reason?: string;
} {
  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, payload: {}, reason: "payload_not_object" };
    }
    return { ok: true, payload: parsed as Record<string, JsonLike> };
  } catch {
    return { ok: false, payload: {}, reason: "invalid_json" };
  }
}

