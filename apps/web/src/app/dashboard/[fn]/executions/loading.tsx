export default function ExecutionsLoading() {
  return (
    <div className="space-y-4">
      <div className="h-10 animate-pulse rounded-lg border border-border bg-muted/30" />
      <div className="space-y-2 rounded-lg border border-border p-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="h-8 animate-pulse rounded bg-muted/30" />
        ))}
      </div>
    </div>
  );
}
