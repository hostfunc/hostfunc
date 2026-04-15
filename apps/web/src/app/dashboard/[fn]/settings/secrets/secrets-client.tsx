"use client";

import { deleteSecret, setSecret } from "@/app/dashboard/[fn]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SecretListItem {
  id: string;
  key: string;
  updatedAt: Date;
}

export function SecretsClient({
  fnId,
  initialSecrets,
}: {
  fnId: string;
  initialSecrets: SecretListItem[];
}) {
  const [secrets, setSecrets] = useState(initialSecrets);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const onAdd = async () => {
    if (!key.trim() || !value.trim()) return;
    try {
      setSaving(true);
      await setSecret({ fnId, key: key.trim(), value });
      const existing = secrets.find((item) => item.key === key.trim());
      if (existing) {
        setSecrets((prev) =>
          prev.map((item) =>
            item.key === key.trim() ? { ...item, updatedAt: new Date() } : item,
          ),
        );
      } else {
        setSecrets((prev) => [
          {
            id: crypto.randomUUID(),
            key: key.trim(),
            updatedAt: new Date(),
          },
          ...prev,
        ]);
      }
      setValue("");
      toast.success("Secret saved");
    } catch (error) {
      toast.error("Failed to save secret");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (secretKey: string) => {
    try {
      await deleteSecret({ fnId, key: secretKey });
      setSecrets((prev) => prev.filter((item) => item.key !== secretKey));
      toast.success("Secret deleted");
    } catch (error) {
      toast.error("Failed to delete secret");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/65">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <KeyRound className="h-4 w-4 text-primary" />
            Function Secrets
          </div>
          <span className="text-xs text-[var(--color-bone-faint)]">{secrets.length} configured</span>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {secrets.length === 0 ? (
            <div className="px-4 py-6 text-sm text-[var(--color-bone-muted)]">
              No secrets yet. Add one below to inject it at runtime.
            </div>
          ) : (
            secrets.map((secret) => (
              <div key={secret.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-mono text-sm">{secret.key}</div>
                  <div className="text-xs text-[var(--color-bone-faint)]">
                    Updated {new Date(secret.updatedAt).toLocaleString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void onDelete(secret.key)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/65 p-4">
        <div className="mb-3 text-sm font-medium">Add or update secret</div>
        <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <Input
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="KEY (e.g. API_TOKEN)"
            className="font-mono"
          />
          <Input
            type="password"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Secret value"
            className="font-mono"
          />
          <Button onClick={() => void onAdd()} disabled={saving || !key.trim() || !value.trim()}>
            <Plus className="mr-1 h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
