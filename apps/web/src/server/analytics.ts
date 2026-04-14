import "server-only";

import { env } from "@/lib/env";
import { db, genId, schema } from "@hostfunc/db";

type AnalyticsProps = Record<string, unknown>;

export async function trackServerEvent(input: {
  event: string;
  distinctId: string;
  props?: AnalyticsProps;
}) {
  const id = genId("evt");
  await db.insert(schema.webhookEvent).values({
    id,
    source: "analytics",
    externalId: id,
    kind: input.event,
    payload: {
      distinctId: input.distinctId,
      props: input.props ?? {},
    },
    processedAt: new Date(),
  });

  if (!env.POSTHOG_API_KEY || !env.POSTHOG_PROJECT_ID) {
    return;
  }

  const endpoint = `${env.POSTHOG_HOST ?? "https://us.i.posthog.com"}/capture/`;
  await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: env.POSTHOG_API_KEY,
      event: input.event,
      distinct_id: input.distinctId,
      properties: {
        ...input.props,
        $groups: {
          project: env.POSTHOG_PROJECT_ID,
        },
      },
    }),
  }).catch(() => null);
}
