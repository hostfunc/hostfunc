import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireActiveOrg } from "@/lib/session";
import { searchFunctionsForOrg } from "@/server/functions";
import { FunctionsSearchFilter } from "./search-filter";
import { CopyButton } from "./copy-button";
import { Settings, ExternalLink, Activity, Plus } from "lucide-react";

export default async function FunctionsExplorerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; visibility?: string }>;
}) {
  const { orgId } = await requireActiveOrg();
  const params = await searchParams;
  
  const query = params.q;
  const visibility = params.visibility;

  const functions = await searchFunctionsForOrg(orgId, query, visibility);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Functions Explorer</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage, filter, and discover your deployed serverless workloads.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/new">
            <Plus className="mr-2 h-4 w-4" />
            New Function
          </Link>
        </Button>
      </div>

      {/* Control Bar */}
      <FunctionsSearchFilter initialQuery={query} initialVisibility={visibility} />

      {/* Grid Results */}
      {functions.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {functions.map((fn) => (
            <div key={fn.id} className="group relative rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/40 flex flex-col justify-between overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-mono text-sm font-semibold">{fn.slug}</h3>
                      <p className="text-[10px] text-muted-foreground">Deployed {formatDistanceToNow(fn.updatedAt, { addSuffix: true })}</p>
                    </div>
                  </div>
                  <Badge variant={fn.visibility === "public" ? "default" : "secondary"} className="capitalize shadow-sm">
                    {fn.visibility}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                  {fn.description || "No description provided."}
                </p>
              </div>

              {/* Hover Actions Bar */}
              <div className="border-t bg-muted/40 p-3 flex items-center justify-between transition-colors group-hover:bg-muted/80">
                <div className="flex items-center gap-2">
                  <CopyButton value={`https://${fn.slug}.hostfunc.com`} />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild className="h-8 shadow-sm bg-background border">
                    <Link href={`/dashboard/${fn.id}/settings`}>
                      <Settings className="h-3.5 w-3.5 mr-1.5" />
                      Settings
                    </Link>
                  </Button>
                  <Button size="sm" asChild className="h-8 shadow-sm">
                    <Link href={`/dashboard/${fn.id}`}>
                      Open
                      <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid place-items-center py-24 text-center border rounded-xl bg-card/50 shadow-sm border-dashed mt-8">
          <Activity className="h-10 w-10 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold">No functions found</h2>
          <p className="mt-2 text-sm text-muted-foreground mb-6 max-w-sm">
            {query || visibility 
              ? "We couldn't find any functions matching your current filters. Try adjusting your search query or visibility filter." 
              : "You haven't deployed any functions to this workspace yet."}
          </p>
          {(query || visibility) && (
            <Button variant="outline" asChild>
              <Link href="/dashboard/functions">Clear all filters</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
