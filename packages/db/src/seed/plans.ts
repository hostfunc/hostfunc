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
      maxFunctions: 1_000,
      maxExecutionsPerDay: 1_000_000,
      maxWallMs: 60_000,
      maxCpuMs: 10_000,
      maxMemoryMb: 256,
      maxEgressKbPerExecution: 10_240,
      maxSubrequestsPerExecution: 100,
      maxCallDepth: 10,
      maxSecretsPerFunction: 50,
      maxTeamMembers: 3,
    },
  },
  {
    slug: "team",
    name: "Team",
    priceMonthlyCents: 2_500,
    limits: {
      maxFunctions: 10_000,
      maxExecutionsPerDay: 10_000_000,
      maxWallMs: 300_000,
      maxCpuMs: 60_000,
      maxMemoryMb: 1_024,
      maxEgressKbPerExecution: 102_400,
      maxSubrequestsPerExecution: 1_000,
      maxCallDepth: 20,
      maxSecretsPerFunction: 200,
      maxTeamMembers: 25,
    },
  },
] as const;
