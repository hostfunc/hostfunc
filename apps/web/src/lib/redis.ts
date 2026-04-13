import "server-only";

import { Redis } from "ioredis";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __hostfunc_redis__: Redis | undefined;
}

function buildRedisClient(): Redis {
  const client = new Redis(env.REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });
  client.on("error", (error) => {
    console.error("[redis] error", error.message);
  });
  return client;
}

export const redis = globalThis.__hostfunc_redis__ ?? buildRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__hostfunc_redis__ = redis;
}
