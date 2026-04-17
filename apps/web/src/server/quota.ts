export function shouldBlockMonthlyWallUsage(usageMs: number, limitMs: number): boolean {
  return usageMs >= limitMs;
}
