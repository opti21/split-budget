import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  cycles: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    totalPay: v.number(),
    isActive: v.boolean(),
    // Add support for split cycles
    hasPeriods: v.optional(v.boolean()),
    periodCount: v.optional(v.number()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_and_date", ["ownerId", "startDate"]),

  cyclePeriods: defineTable({
    cycleId: v.id("cycles"),
    name: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    periodNumber: v.number(), // 1, 2, 3, etc.
    budget: v.number(),
    actualIncome: v.optional(v.number()),
    carryOverFromPrevious: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("by_cycle", ["cycleId"])
    .index("by_cycle_and_period", ["cycleId", "periodNumber"]),

  // Add period-specific budget allocations
  periodAllocations: defineTable({
    periodId: v.id("cyclePeriods"),
    cycleId: v.id("cycles"),
    name: v.string(),
    allocatedAmount: v.number(),
    actualSpent: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("by_period", ["periodId"])
    .index("by_cycle", ["cycleId"]),

  transactions: defineTable({
    cycleId: v.id("cycles"),
    periodId: v.optional(v.id("cyclePeriods")),
    allocationId: v.optional(v.id("periodAllocations")),
    description: v.string(),
    amount: v.number(),
    type: v.union(v.literal("income"), v.literal("expense")),
    date: v.number(),
    addedBy: v.id("users"),
  })
    .index("by_cycle", ["cycleId"])
    .index("by_period", ["periodId"])
    .index("by_cycle_and_date", ["cycleId", "date"])
    .index("by_allocation", ["allocationId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
