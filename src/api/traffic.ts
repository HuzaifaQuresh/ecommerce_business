import { createServerFn } from "@tanstack/react-start";
import { loadTrafficStats, recordStorefrontVisit, type TrafficStats } from "@/lib/traffic-store";

async function trafficKv(): Promise<KVNamespace> {
  const { env } = await import("cloudflare:workers");
  const kv = (env as { INBOX?: KVNamespace }).INBOX;
  if (!kv) throw new Error("Traffic storage is not bound on this Worker");
  return kv;
}

export const recordVisit = createServerFn({ method: "POST" })
  .validator((d: { sessionId: string; path: string }) => d)
  .handler(async ({ data }) => {
    const kv = await trafficKv();
    await recordStorefrontVisit(kv, data);
    return { ok: true as const };
  });

export const fetchTrafficStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<TrafficStats> => {
    const kv = await trafficKv();
    return loadTrafficStats(kv);
  },
);
