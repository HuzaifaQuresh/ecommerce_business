export type TrafficDay = {
  date: string;
  pageviews: number;
  uniques: number;
  paths: Record<string, number>;
};

export type TrafficTotals = {
  pageviews: number;
  uniques: number;
};

export type TrafficStats = {
  today: TrafficDay;
  yesterday: TrafficDay | null;
  last7: { pageviews: number; uniques: number };
  last30: { pageviews: number; uniques: number };
  allTime: TrafficTotals;
  daily: Array<{ date: string; pageviews: number; uniques: number }>;
  topPaths: Array<{ path: string; views: number }>;
};

const DAY_PREFIX = "traffic:day:";
const TOTALS_KEY = "traffic:totals";
const SEEN_PREFIX = "traffic:seen:";

export function karachiDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function emptyDay(date: string): TrafficDay {
  return { date, pageviews: 0, uniques: 0, paths: {} };
}

function shiftKarachiDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d) + days * 86400000;
  return new Date(utc).toISOString().slice(0, 10);
}

async function readDay(kv: KVNamespace, date: string): Promise<TrafficDay> {
  const raw = await kv.get(`${DAY_PREFIX}${date}`);
  if (!raw) return emptyDay(date);
  try {
    const parsed = JSON.parse(raw) as TrafficDay;
    return {
      date,
      pageviews: Number(parsed.pageviews) || 0,
      uniques: Number(parsed.uniques) || 0,
      paths: parsed.paths && typeof parsed.paths === "object" ? parsed.paths : {},
    };
  } catch {
    return emptyDay(date);
  }
}

async function readTotals(kv: KVNamespace): Promise<TrafficTotals> {
  const raw = await kv.get(TOTALS_KEY);
  if (!raw) return { pageviews: 0, uniques: 0 };
  try {
    const parsed = JSON.parse(raw) as TrafficTotals;
    return {
      pageviews: Number(parsed.pageviews) || 0,
      uniques: Number(parsed.uniques) || 0,
    };
  } catch {
    return { pageviews: 0, uniques: 0 };
  }
}

export async function recordStorefrontVisit(
  kv: KVNamespace,
  input: { sessionId: string; path: string },
): Promise<void> {
  const sessionId = input.sessionId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  if (sessionId.length < 8) return;

  let path = input.path.startsWith("/") ? input.path : `/${input.path}`;
  path = path.slice(0, 180);
  if (path.startsWith("/admin") || path.startsWith("/vendor")) return;

  const date = karachiDate();
  const seenKey = `${SEEN_PREFIX}${date}:${sessionId}`;
  const already = await kv.get(seenKey);
  const isUnique = !already;

  const day = await readDay(kv, date);
  day.pageviews += 1;
  if (isUnique) day.uniques += 1;
  day.paths[path] = (day.paths[path] ?? 0) + 1;

  const pathKeys = Object.keys(day.paths);
  if (pathKeys.length > 80) {
    const ranked = pathKeys.sort((a, b) => day.paths[b] - day.paths[a]).slice(0, 60);
    const next: Record<string, number> = {};
    for (const k of ranked) next[k] = day.paths[k];
    day.paths = next;
  }

  const totals = await readTotals(kv);
  totals.pageviews += 1;
  if (isUnique) totals.uniques += 1;

  const writes: Promise<unknown>[] = [
    kv.put(`${DAY_PREFIX}${date}`, JSON.stringify(day)),
    kv.put(TOTALS_KEY, JSON.stringify(totals)),
  ];
  if (isUnique) {
    writes.push(kv.put(seenKey, "1", { expirationTtl: 60 * 60 * 48 }));
  }
  await Promise.all(writes);
}

export async function loadTrafficStats(kv: KVNamespace): Promise<TrafficStats> {
  const today = karachiDate();
  const dates = Array.from({ length: 30 }, (_, i) => shiftKarachiDate(today, -i));
  const days = await Promise.all(dates.map((d) => readDay(kv, d)));
  const totals = await readTotals(kv);

  const sumRange = (n: number) =>
    days.slice(0, n).reduce(
      (acc, d) => ({ pageviews: acc.pageviews + d.pageviews, uniques: acc.uniques + d.uniques }),
      { pageviews: 0, uniques: 0 },
    );

  const pathCounts: Record<string, number> = {};
  for (const d of days.slice(0, 14)) {
    for (const [p, n] of Object.entries(d.paths)) {
      pathCounts[p] = (pathCounts[p] ?? 0) + n;
    }
  }
  const topPaths = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([path, views]) => ({ path, views }));

  return {
    today: days[0],
    yesterday: days[1] ?? null,
    last7: sumRange(7),
    last30: sumRange(30),
    allTime: totals,
    daily: [...days]
      .slice(0, 14)
      .reverse()
      .map((d) => ({ date: d.date.slice(5), pageviews: d.pageviews, uniques: d.uniques })),
    topPaths,
  };
}
