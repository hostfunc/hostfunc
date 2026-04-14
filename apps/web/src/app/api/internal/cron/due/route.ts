import { env } from "@/lib/env";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

interface CronCandidate {
  triggerId: string;
  fnId: string;
  orgId: string;
  owner: string;
  slug: string;
  schedule: string;
  timezone?: string;
}

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${env.TRIGGER_CONTROL_TOKEN}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const minuteIso = new Date().toISOString().slice(0, 16);

  const rows = await db
    .select({
      triggerId: schema.trigger.id,
      fnId: schema.trigger.fnId,
      orgId: schema.trigger.orgId,
      owner: schema.fn.createdById,
      slug: schema.fn.slug,
      config: schema.trigger.config,
    })
    .from(schema.trigger)
    .innerJoin(schema.fn, eq(schema.fn.id, schema.trigger.fnId))
    .where(and(eq(schema.trigger.kind, "cron"), eq(schema.trigger.enabled, true)));

  const due = rows
    .map((row) => {
      const cron = row.config?.cron;
      if (!cron?.schedule) return null;
      const candidate: CronCandidate = {
        triggerId: row.triggerId,
        fnId: row.fnId,
        orgId: row.orgId,
        owner: row.owner,
        slug: row.slug,
        schedule: cron.schedule,
      };
      if (cron.timezone) candidate.timezone = cron.timezone;
      return shouldFireNow(cron.schedule) ? candidate : null;
    })
    .filter((row): row is CronCandidate => Boolean(row))
    .map((row) => ({
      ...row,
      dedupeKey: `${row.triggerId}:${minuteIso}`,
    }));

  return Response.json({ due, minuteIso });
}

function shouldFireNow(schedule: string): boolean {
  const now = new Date();
  const minute = now.getUTCMinutes();
  const hour = now.getUTCHours();
  const parts = schedule.trim().split(/\s+/);
  if (parts.length < 5) return false;
  const [m, h] = parts;
  if (!m || !h) return false;
  return matchPart(m, minute) && matchPart(h, hour);
}

function matchPart(part: string, current: number): boolean {
  if (part === "*") return true;
  if (part.startsWith("*/")) {
    const step = Number(part.slice(2));
    return Number.isFinite(step) && step > 0 ? current % step === 0 : false;
  }
  if (part.includes(",")) {
    return part
      .split(",")
      .map((v) => Number(v))
      .some((v) => Number.isFinite(v) && v === current);
  }
  const exact = Number(part);
  return Number.isFinite(exact) && exact === current;
}
