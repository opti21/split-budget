import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

async function getLoggedInUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return userId;
}

async function checkCycleAccess(ctx: any, cycleId: string) {
  const userId = await getLoggedInUser(ctx);
  const cycle = await ctx.db.get(cycleId);

  if (!cycle) {
    throw new Error("Cycle not found");
  }

  if (cycle.ownerId !== userId) {
    throw new Error("Access denied");
  }

  return cycle;
}

export const createCycle = mutation({
  args: {
    name: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    totalPay: v.number(),
  },
  returns: v.id("cycles"),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);

    // Deactivate previous active cycle
    const activeCycles = await ctx.db
      .query("cycles")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    for (const cycle of activeCycles) {
      await ctx.db.patch(cycle._id, { isActive: false });
    }

    return await ctx.db.insert("cycles", {
      ownerId: userId,
      name: args.name,
      startDate: args.startDate,
      endDate: args.endDate,
      totalPay: args.totalPay,
      isActive: true,
    });
  },
});

export const createCycleWithPeriods = mutation({
  args: {
    name: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    totalPay: v.number(),
    periods: v.array(
      v.object({
        name: v.string(),
        startDate: v.number(),
        endDate: v.number(),
        budget: v.number(),
      })
    ),
    allocations: v.array(
      v.object({
        periodNumber: v.number(),
        name: v.string(),
        allocatedAmount: v.number(),
      })
    ),
  },
  returns: v.id("cycles"),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    // Deactivate previous active cycle
    const activeCycles = await ctx.db
      .query("cycles")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    for (const cycle of activeCycles) {
      await ctx.db.patch(cycle._id, { isActive: false });
    }
    // Calculate budgets
    const firstPeriodBudget = args.allocations.reduce(
      (sum, a) => sum + a.allocatedAmount,
      0
    );
    const secondPeriodBudget = args.totalPay - firstPeriodBudget;
    // Create the main cycle
    const cycleId = await ctx.db.insert("cycles", {
      ownerId: userId,
      name: args.name,
      startDate: args.startDate,
      endDate: args.endDate,
      totalPay: args.totalPay,
      isActive: true,
      hasPeriods: true,
      periodCount: 2,
    });
    // Create periods
    const periodIds: any[] = [];
    for (let i = 0; i < 2; i++) {
      const period = args.periods[i];
      const budget = i === 0 ? firstPeriodBudget : secondPeriodBudget;
      const periodId = await ctx.db.insert("cyclePeriods", {
        cycleId,
        name: period.name,
        startDate: period.startDate,
        endDate: period.endDate,
        periodNumber: i + 1,
        budget,
        carryOverFromPrevious: i === 0 ? 0 : undefined,
        isActive: true,
      });
      periodIds.push(periodId);
    }
    // Create allocations for the first period only
    for (const allocation of args.allocations) {
      if (allocation.periodNumber === 1) {
        const periodId = periodIds[0];
        await ctx.db.insert("periodAllocations", {
          periodId,
          cycleId,
          name: allocation.name,
          allocatedAmount: allocation.allocatedAmount,
          isActive: true,
        });
      }
    }
    return cycleId;
  },
});

export const getCycleWithPeriods = query({
  args: { cycleId: v.id("cycles") },
  returns: v.object({
    cycle: v.object({
      _id: v.id("cycles"),
      _creationTime: v.number(),
      ownerId: v.id("users"),
      name: v.string(),
      startDate: v.number(),
      endDate: v.number(),
      totalPay: v.number(),
      isActive: v.boolean(),
      hasPeriods: v.optional(v.boolean()),
      periodCount: v.optional(v.number()),
    }),
    periods: v.array(v.any()),
    allocations: v.array(v.any()),
  }),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    const cycle = await ctx.db.get(args.cycleId);
    if (!cycle) {
      throw new Error("Cycle not found");
    }

    if (cycle.ownerId !== userId) {
      throw new Error("Access denied");
    }

    if (!cycle.hasPeriods) {
      return { cycle, periods: [], allocations: [] };
    }

    // Get periods
    const periods = await ctx.db
      .query("cyclePeriods")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Sort periods by period number
    periods.sort((a, b) => a.periodNumber - b.periodNumber);

    // Get allocations for all periods
    const allocations = await ctx.db
      .query("periodAllocations")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Calculate dynamic budget adjustments
    const periodsWithAdjustments = [];
    let carryOverAmount = 0;

    for (const period of periods) {
      // Get spending for this period
      const periodTransactions = await ctx.db
        .query("transactions")
        .withIndex("by_period", (q) => q.eq("periodId", period._id))
        .filter((q) => q.eq(q.field("type"), "expense"))
        .collect();

      const totalSpent = periodTransactions.reduce(
        (sum, tx) => sum + tx.amount,
        0
      );

      // Get allocations for this period
      const periodAllocations = allocations.filter(
        (a) => a.periodId === period._id
      );
      const totalAllocated = periodAllocations.reduce(
        (sum, a) => sum + a.allocatedAmount,
        0
      );

      // Calculate available budget (actual income + carry-over from previous period)
      const availableBudget =
        (period.actualIncome || period.budget) + carryOverAmount;

      // Calculate remaining budget for next period
      const remainingBudget = availableBudget - totalSpent;

      periodsWithAdjustments.push({
        ...period,
        totalAllocated,
        totalSpent,
        availableBudget,
        remainingBudget,
        carryOverFromPrevious: carryOverAmount,
        allocations: periodAllocations,
      });

      // Set carry-over for next period (remaining budget becomes carry-over)
      carryOverAmount = remainingBudget;
    }

    return {
      cycle,
      periods: periodsWithAdjustments,
      allocations,
    };
  },
});

export const updatePeriodSpending = mutation({
  args: {
    periodId: v.id("cyclePeriods"),
    allocationId: v.id("periodAllocations"),
    actualSpent: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    const period = await ctx.db.get(args.periodId);
    if (!period) {
      throw new Error("Period not found");
    }

    const cycle = await ctx.db.get(period.cycleId);
    if (!cycle) {
      throw new Error("Cycle not found");
    }

    if (cycle.ownerId !== userId) {
      throw new Error("Access denied");
    }

    // Update the allocation's actual spent amount
    await ctx.db.patch(args.allocationId, {
      actualSpent: args.actualSpent,
    });

    return null;

    // Recalculate carry-over for subsequent periods
    // This will be handled by the getCycleWithPeriods query automatically
  },
});

export const updateAllocation = mutation({
  args: {
    allocationId: v.id("periodAllocations"),
    name: v.string(),
    allocatedAmount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    const allocation = await ctx.db.get(args.allocationId);
    if (!allocation) {
      throw new Error("Allocation not found");
    }
    const cycle = await ctx.db.get(allocation.cycleId);
    if (!cycle) {
      throw new Error("Cycle not found");
    }
    if (cycle.ownerId !== userId) {
      throw new Error("Access denied");
    }
    await ctx.db.patch(args.allocationId, {
      name: args.name,
      allocatedAmount: args.allocatedAmount,
    });
    return null;
  },
});

export const getUserCycles = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("cycles"),
      _creationTime: v.number(),
      ownerId: v.id("users"),
      name: v.string(),
      startDate: v.number(),
      endDate: v.number(),
      totalPay: v.number(),
      isActive: v.boolean(),
      hasPeriods: v.optional(v.boolean()),
      periodCount: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);

    return await ctx.db
      .query("cycles")
      .withIndex("by_owner_and_date", (q) => q.eq("ownerId", userId))
      .order("desc")
      .collect();
  },
});

export const getActiveCycle = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("cycles"),
      _creationTime: v.number(),
      ownerId: v.id("users"),
      name: v.string(),
      startDate: v.number(),
      endDate: v.number(),
      totalPay: v.number(),
      isActive: v.boolean(),
      hasPeriods: v.optional(v.boolean()),
      periodCount: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);

    return await ctx.db
      .query("cycles")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
  },
});

export const updateCycle = mutation({
  args: {
    cycleId: v.id("cycles"),
    name: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    totalPay: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    const cycle = await ctx.db.get(args.cycleId);
    if (!cycle) {
      throw new Error("Cycle not found");
    }

    if (cycle.ownerId !== userId) {
      throw new Error("Access denied");
    }

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.startDate !== undefined) updates.startDate = args.startDate;
    if (args.endDate !== undefined) updates.endDate = args.endDate;
    if (args.totalPay !== undefined) updates.totalPay = args.totalPay;

    await ctx.db.patch(args.cycleId, updates);
    return null;
  },
});

export const deleteCycle = mutation({
  args: { cycleId: v.id("cycles") },
  returns: v.null(),
  handler: async (ctx, { cycleId }) => {
    const userId = await getLoggedInUser(ctx);
    const cycle = await ctx.db.get(cycleId);
    if (!cycle) {
      throw new Error("Cycle not found");
    }

    if (cycle.ownerId !== userId) {
      throw new Error("Access denied");
    }

    // Delete related periods
    const periods = await ctx.db
      .query("cyclePeriods")
      .withIndex("by_cycle", (q) => q.eq("cycleId", cycleId))
      .collect();
    for (const period of periods) {
      // Delete allocations for this period
      const allocations = await ctx.db
        .query("periodAllocations")
        .withIndex("by_period", (q) => q.eq("periodId", period._id))
        .collect();
      for (const allocation of allocations) {
        await ctx.db.delete(allocation._id);
      }
      await ctx.db.delete(period._id);
    }

    // Delete allocations directly linked to the cycle (if any)
    const cycleAllocations = await ctx.db
      .query("periodAllocations")
      .withIndex("by_cycle", (q) => q.eq("cycleId", cycleId))
      .collect();
    for (const allocation of cycleAllocations) {
      await ctx.db.delete(allocation._id);
    }

    // Delete the cycle itself
    await ctx.db.delete(cycleId);
    return null;
  },
});

export const getCycle = query({
  args: {
    cycleId: v.id("cycles"),
  },
  returns: v.union(
    v.object({
      _id: v.id("cycles"),
      _creationTime: v.number(),
      ownerId: v.id("users"),
      name: v.string(),
      startDate: v.number(),
      endDate: v.number(),
      totalPay: v.number(),
      isActive: v.boolean(),
      hasPeriods: v.optional(v.boolean()),
      periodCount: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    const cycle = await ctx.db.get(args.cycleId);

    if (!cycle) {
      return null;
    }

    // Check if user has access to this cycle
    if (cycle.ownerId !== userId) {
      throw new Error("Access denied");
    }

    return cycle;
  },
});

export const getAllUserCycles = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("cycles"),
      _creationTime: v.number(),
      ownerId: v.id("users"),
      name: v.string(),
      startDate: v.number(),
      endDate: v.number(),
      totalPay: v.number(),
      isActive: v.boolean(),
      hasPeriods: v.optional(v.boolean()),
      periodCount: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);

    const cycles = await ctx.db
      .query("cycles")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .order("desc")
      .collect();

    return cycles;
  },
});

export const getCycleAllocations = query({
  args: {
    cycleId: v.id("cycles"),
  },
  returns: v.array(
    v.object({
      _id: v.id("periodAllocations"),
      _creationTime: v.number(),
      periodId: v.id("cyclePeriods"),
      cycleId: v.id("cycles"),
      name: v.string(),
      allocatedAmount: v.number(),
      actualSpent: v.optional(v.number()),
      isActive: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    const cycle = await ctx.db.get(args.cycleId);

    if (!cycle) {
      throw new Error("Cycle not found");
    }

    // Check if user has access to this cycle
    if (cycle.ownerId !== userId) {
      throw new Error("Access denied");
    }

    const allocations = await ctx.db
      .query("periodAllocations")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .collect();

    return allocations;
  },
});

// Add a public mutation to add an allocation to a period after cycle creation
export const addAllocation = mutation({
  args: {
    periodId: v.id("cyclePeriods"),
    cycleId: v.id("cycles"),
    name: v.string(),
    allocatedAmount: v.number(),
  },
  returns: v.id("periodAllocations"),
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    const cycle = await ctx.db.get(args.cycleId);
    if (!cycle) {
      throw new Error("Cycle not found");
    }
    if (cycle.ownerId !== userId) {
      throw new Error("Access denied");
    }
    const period = await ctx.db.get(args.periodId);
    if (!period || period.cycleId !== args.cycleId) {
      throw new Error("Period not found or does not belong to cycle");
    }
    return await ctx.db.insert("periodAllocations", {
      periodId: args.periodId,
      cycleId: args.cycleId,
      name: args.name,
      allocatedAmount: args.allocatedAmount,
      isActive: true,
    });
  },
});

export const updateTotalPay = mutation({
  args: {
    cycleId: v.id("cycles"),
    totalPay: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.cycleId, { totalPay: args.totalPay });
    return null;
  },
});
