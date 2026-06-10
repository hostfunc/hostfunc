/**
 * Parses user-entered JSON run payloads. An empty input means "no payload" (`{}`). Anything that
 * parses to a JSON object is accepted; primitives/arrays are rejected since `main(input)` receives
 * an object. Pure + dependency-free for unit testing.
 */
export function parsePayload(input: string): Record<string, unknown> {
  const trimmed = input.trim();
  if (trimmed === "") return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Payload is not valid JSON.");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error('Payload must be a JSON object, e.g. {"name":"world"}.');
  }
  return parsed as Record<string, unknown>;
}

/** Validates payload input for an InputBox; returns an error string or undefined when valid. */
export function validatePayloadInput(input: string): string | undefined {
  try {
    parsePayload(input);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid payload.";
  }
}
