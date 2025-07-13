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

export const createTransaction = mutation({
  args: {
    cycleId: v.id("cycles"),
    periodId: v.optional(v.id("cyclePeriods")),
    allocationId: v.optional(v.id("periodAllocations")),
    description: v.string(),
    amount: v.number(),
    type: v.union(v.literal("income"), v.literal("expense")),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    await checkCycleAccess(ctx, args.cycleId);

    return await ctx.db.insert("transactions", {
      cycleId: args.cycleId,
      periodId: args.periodId,
      allocationId: args.allocationId,
      description: args.description,
      amount: args.amount,
      type: args.type,
      date: args.date,
      addedBy: userId,
    });
  },
});

export const updateTransaction = mutation({
  args: {
    transactionId: v.id("transactions"),
    description: v.optional(v.string()),
    amount: v.optional(v.number()),
    type: v.optional(v.union(v.literal("income"), v.literal("expense"))),
    date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    await checkCycleAccess(ctx, transaction.cycleId);

    const updates: any = {};
    if (args.description !== undefined) updates.description = args.description;
    if (args.amount !== undefined) updates.amount = args.amount;
    if (args.type !== undefined) updates.type = args.type;
    if (args.date !== undefined) updates.date = args.date;

    await ctx.db.patch(args.transactionId, updates);
  },
});

export const deleteTransaction = mutation({
  args: { transactionId: v.id("transactions") },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    await checkCycleAccess(ctx, transaction.cycleId);

    await ctx.db.delete(args.transactionId);
  },
});

export const getTransactionsForCycle = query({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, args) => {
    await checkCycleAccess(ctx, args.cycleId);

    return await ctx.db
      .query("transactions")
      .withIndex("by_cycle_and_date", (q) => q.eq("cycleId", args.cycleId))
      .order("desc")
      .collect();
  },
});

export const getCycleTransactions = query({
  args: { cycleId: v.id("cycles") },
  returns: v.array(
    v.object({
      _id: v.id("transactions"),
      _creationTime: v.number(),
      cycleId: v.id("cycles"),
      periodId: v.optional(v.id("cyclePeriods")),
      allocationId: v.optional(v.id("periodAllocations")),
      description: v.string(),
      amount: v.number(),
      type: v.union(v.literal("income"), v.literal("expense")),
      date: v.number(),
      addedBy: v.id("users"),
    })
  ),
  handler: async (ctx, args) => {
    await checkCycleAccess(ctx, args.cycleId);

    return await ctx.db
      .query("transactions")
      .withIndex("by_cycle_and_date", (q) => q.eq("cycleId", args.cycleId))
      .order("desc")
      .collect();
  },
});
