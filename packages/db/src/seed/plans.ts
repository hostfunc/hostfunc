import type { PlanLimits } from "../schema/billing.js";

export interface PlanSeed {
  slug: "free" | "pro" | "team";
  name: string;
  priceMonthlyCents: number;
  limits: PlanLimits;
}

export const PLANS: readonly PlanSeed[] = [
  {
    slug: "free",
    name: "Free",
    priceMonthlyCents: 0,
    limits: {
      maxFunctions: 3,
      maxExecutionsPerDay: 100,
      maxWallMs: 10_000,
      maxCpuMs: 1_000,
      maxMemoryMb: 128,
      maxEgressKbPerExecution: 1_024,
      maxSubrequestsPerExecution: 20,
      maxCallDepth: 3,
      maxSecretsPerFunction: 5,
      maxTeamMembers: 1,
    },
  },
  {
    slug: "pro",
    name: "Pro",
    priceMonthlyCents: 500,
    limits: {
      maxFunctions: 2_000,
      maxExecutionsPerDay: 2_000_000,
      maxWallMs: 120_000,
      maxCpuMs: 20_000,
      maxMemoryMb: 512,
      maxEgressKbPerExecution: 20_480,
      maxSubrequestsPerExecution: 200,
      maxCallDepth: 20,
      maxSecretsPerFunction: 100,
      maxTeamMembers: 6,
    },
  },
  {
    slug: "team",
    name: "Team",
    priceMonthlyCents: 2_500,
    limits: {
      maxFunctions: 20_000,
      maxExecutionsPerDay: 20_000_000,
      maxWallMs: 600_000,
      maxCpuMs: 120_000,
      maxMemoryMb: 2_048,
      maxEgressKbPerExecution: 204_800,
      maxSubrequestsPerExecution: 2_000,
      maxCallDepth: 40,
      maxSecretsPerFunction: 400,
      maxTeamMembers: 50,
    },
  },
] as const;
