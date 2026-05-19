import { ZodError } from "zod";

export type FormattedAuthError = {
  title: string;
  detail?: string;
  fields?: Record<string, string>;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function collectZodLikeIssues(issues: readonly { path?: unknown; message?: unknown }[]): {
  message: string;
  fields: Record<string, string>;
} {
  const fields: Record<string, string> = {};
  const messages: string[] = [];
  for (const issue of issues) {
    const msg = typeof issue.message === "string" ? issue.message : null;
    const path = Array.isArray(issue.path)
      ? issue.path
          .filter((p): p is string | number => typeof p === "string" || typeof p === "number")
          .join(".")
      : "";
    if (msg) {
      messages.push(msg);
      if (path) fields[path] = msg;
    }
  }
  return {
    message: messages[0] ?? "Validation failed",
    fields,
  };
}

/**
 * Normalize Better Auth / fetch / Zod failures for UI (toast + inline).
 */
export function formatAuthError(err: unknown): FormattedAuthError {
  if (err instanceof ZodError) {
    const { message, fields } = collectZodLikeIssues(err.issues);
    return {
      title: "Invalid input",
      detail: message,
      ...(Object.keys(fields).length > 0 ? { fields } : {}),
    };
  }

  if (isRecord(err) && Array.isArray(err.issues)) {
    const { message, fields } = collectZodLikeIssues(
      err.issues as readonly { path?: unknown; message?: unknown }[],
    );
    return {
      title: "Invalid input",
      detail: message,
      ...(Object.keys(fields).length > 0 ? { fields } : {}),
    };
  }

  if (isRecord(err) && "data" in err && isRecord(err.data)) {
    const data = err.data;
    if (Array.isArray(data.issues)) {
      const { message, fields } = collectZodLikeIssues(
        data.issues as readonly { path?: unknown; message?: unknown }[],
      );
      return {
        title: typeof data.message === "string" ? data.message : "Invalid input",
        detail: message,
        ...(Object.keys(fields).length > 0 ? { fields } : {}),
      };
    }
    if (typeof data.message === "string") {
      return { title: "Sign-in failed", detail: data.message };
    }
  }

  if (isRecord(err) && typeof err.message === "string" && err.message) {
    return { title: "Sign-in failed", detail: err.message };
  }

  if (err instanceof Error && err.message) {
    return { title: "Sign-in failed", detail: err.message };
  }

  return { title: "Sign-in failed", detail: "Something went wrong. Please try again." };
}
