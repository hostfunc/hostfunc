import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActiveOrg } from "@/lib/session";
import { getExecution, listLogsForExecution } from "@/server/executions";
import { notFound } from "next/navigation";
import { LiveLogs } from "@/components/logs/live-logs";

export default async function ExecutionDetailPage({
  params,
}: {
  params: Promise<{ fn: string; execId: string }>;
}) {
  const { orgId } = await requireActiveOrg();
  const { execId } = await params;
  const execution = await getExecution(orgId, execId);
  if (!execution) notFound();
  const logs = await listLogsForExecution(orgId, execId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="font-mono text-sm">{execution.id}</span>
            <Badge variant={execution.status === "ok" ? "secondary" : "destructive"}>
              {execution.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <div>Function: {execution.fnSlug}</div>
          <div>Trigger: {execution.triggerKind}</div>
          <div>Wall: {execution.wallMs}ms</div>
          <div>CPU: {execution.cpuMs}ms</div>
          <div>Egress: {execution.egressBytes} bytes</div>
          <div>Subrequests: {execution.subrequestCount}</div>
          <div>Started: {execution.startedAt.toLocaleString()}</div>
          <div>Ended: {execution.endedAt ? execution.endedAt.toLocaleString() : "running"}</div>
        </CardContent>
      </Card>

      {execution.errorMessage ? (
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-destructive">{execution.errorCode ?? "FN_THREW"}</p>
            <p className="font-mono">{execution.errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="max-h-64 space-y-1 overflow-auto rounded border border-border bg-muted/20 p-2 font-mono text-xs">
            {logs.map((line, idx) => (
              <div key={`${line.ts.toISOString()}-${idx}`} className="space-y-1">
                <div className="flex gap-2">
                  <span className="text-muted-foreground">{line.ts.toISOString()}</span>
                  <span className="uppercase text-muted-foreground">{line.level}</span>
                  <span>{line.message}</span>
                </div>
                {line.fields ? (
                  <pre className="overflow-x-auto rounded bg-black/20 p-2 text-[10px] text-slate-300">
                    {JSON.stringify(line.fields, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
          <LiveLogs execId={execution.id} />
        </CardContent>
      </Card>
    </div>
  );
}
