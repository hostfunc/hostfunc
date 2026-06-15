import type { HostfuncApiClient, LogLine, RunResult } from "@hostfunc/api-client";
import * as vscode from "vscode";

/**
 * Renders run results and their execution logs into a dedicated Output channel. M1 uses the
 * one-shot logs endpoint with a short retry; a Bearer SSE stream replaces this in a later milestone.
 */
export class RunLogChannel {
  private readonly channel: vscode.LogOutputChannel;

  constructor() {
    this.channel = vscode.window.createOutputChannel("hostfunc", { log: true });
  }

  async report(client: HostfuncApiClient, slug: string, run: RunResult): Promise<void> {
    this.channel.show(true);
    const ok = run.ok && run.status < 400;
    this.channel.info(`▶ ${slug} — ${ok ? "ok" : `error (${run.status})`}`);
    if (run.executionId) this.channel.info(`  execution: ${run.executionId}`);
    this.channel.info(`  result: ${stringify(run.result)}`);

    if (run.executionId) {
      const lines = await this.fetchLogs(client, run.executionId);
      for (const line of lines) this.print(line);
      if (lines.length === 0) this.channel.info("  (no logs emitted)");
    }
  }

  /** Show the logs for a past execution (from the tree's Recent runs). */
  async showLogs(client: HostfuncApiClient, executionId: string, label: string): Promise<void> {
    this.channel.show(true);
    this.channel.info(`▶ logs for ${label} — execution ${executionId}`);
    const lines = await this.fetchLogs(client, executionId);
    for (const line of lines) this.print(line);
    if (lines.length === 0) this.channel.info("  (no logs emitted)");
  }

  private async fetchLogs(client: HostfuncApiClient, executionId: string): Promise<LogLine[]> {
    // The function runs synchronously, but ingest is async — retry briefly for late log lines.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { logs } = await client.logs(executionId);
      if (logs.length > 0) return logs;
      await new Promise<void>((r) => setTimeout(r, 600));
    }
    return [];
  }

  private print(line: LogLine): void {
    const suffix =
      line.fields && Object.keys(line.fields).length > 0 ? ` ${stringify(line.fields)}` : "";
    const message = `${line.message}${suffix}`;
    switch (line.level) {
      case "error":
        this.channel.error(message);
        break;
      case "warn":
        this.channel.warn(message);
        break;
      case "debug":
        this.channel.debug(message);
        break;
      default:
        this.channel.info(message);
    }
  }

  dispose(): void {
    this.channel.dispose();
  }
}

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
