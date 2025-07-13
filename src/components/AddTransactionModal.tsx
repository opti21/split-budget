import { useMutation, useQuery } from "convex/react";
import { useForm } from "@tanstack/react-form";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useState } from "react";
import React, { useEffect } from "react";

interface AddTransactionModalProps {
  cycleId: Id<"cycles">;
  periodId?: Id<"cyclePeriods">;
  allocationId?: Id<"periodAllocations">;
  onClose: () => void;
}

export function AddTransactionModal({
  cycleId,
  periodId: initialPeriodId,
  allocationId: initialAllocationId,
  onClose,
}: AddTransactionModalProps) {
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  const createTransaction = useMutation(api.transactions.createTransaction);
  const cycleData = useQuery(api.cycles.getCycleWithPeriods, { cycleId });

  // Add state for selected period and allocation
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    initialPeriodId?.toString() || ""
  );
  const [selectedAllocationId, setSelectedAllocationId] = useState<string>(
    initialAllocationId?.toString() || ""
  );

  // If allocationId is provided but periodId is not, set periodId from allocation
  React.useEffect(() => {
    if (
      initialAllocationId &&
      cycleData &&
      Array.isArray(cycleData.allocations)
    ) {
      const allocation = cycleData.allocations.find(
        (a: any) => a._id === initialAllocationId
      );
      if (allocation && !initialPeriodId) {
        setSelectedPeriodId(allocation.periodId);
      }
      setSelectedAllocationId(initialAllocationId);
    }
  }, [initialAllocationId, cycleData, initialPeriodId]);

  // Find the selected period object
  const currentPeriod =
    selectedPeriodId && cycleData && Array.isArray(cycleData.periods)
      ? cycleData.periods.find((p: any) => p._id === selectedPeriodId)
      : undefined;

  const allocationsForPeriod = currentPeriod?.allocations || [];

  const form = useForm({
    defaultValues: {
      description: "",
      amount: "",
      type: "expense" as "income" | "expense",
      date: new Date().toISOString().split("T")[0],
      allocationId: selectedAllocationId,
    },
    onSubmit: async ({ value }) => {
      try {
        if (!value.description?.trim()) {
          toast.error("Description is required");
          return;
        }
        const parsedAmount = parseFloat(value.amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          toast.error("Amount must be greater than 0");
          return;
        }
        if (
          cycleData &&
          Array.isArray(cycleData.periods) &&
          cycleData.periods.length > 0 &&
          !selectedPeriodId
        ) {
          toast.error("Please select a period");
          return;
        }
        await createTransaction({
          cycleId,
          periodId: selectedPeriodId
            ? (selectedPeriodId as Id<"cyclePeriods">)
            : undefined,
          allocationId:
            value.allocationId === ""
              ? undefined
              : (value.allocationId as Id<"periodAllocations">),
          description: value.description.trim(),
          amount: parsedAmount,
          type: value.type,
          date: new Date(value.date).getTime(),
        });
        toast.success("Transaction added successfully!");
        onClose();
      } catch (error) {
        toast.error("Failed to add transaction");
        console.error(error);
      }
    },
  });

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-md relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl"
          title="Close"
        >
          ×
        </button>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Add Transaction</h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void form.handleSubmit();
            }}
            className="space-y-4"
          >
            {/* Period selection dropdown if periods exist */}
            {cycleData &&
              Array.isArray(cycleData.periods) &&
              cycleData.periods.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Period *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={selectedPeriodId}
                    onChange={(e) => {
                      setSelectedPeriodId(e.target.value);
                      setSelectedAllocationId("");
                      form.setFieldValue("allocationId", ""); // Reset allocation on period change
                    }}
                    required
                  >
                    <option value="">-- Select Period --</option>
                    {cycleData.periods.map((period: any) => (
                      <option key={period._id} value={period._id}>
                        {period.name} (
                        {new Date(period.startDate).toLocaleDateString()} -{" "}
                        {new Date(period.endDate).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

            {/* Allocation selection for the selected period - moved here */}
            {allocationsForPeriod.length > 0 && (
              <form.Field name="allocationId">
                {(field) => (
                  <div>
                    <label
                      htmlFor="allocationId"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Allocate to (Optional)
                    </label>
                    <select
                      id="allocationId"
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        setSelectedAllocationId(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">None</option>
                      {allocationsForPeriod.map((allocation: any) => (
                        <option key={allocation._id} value={allocation._id}>
                          {allocation.name} (Allocated:{" "}
                          {formatCurrency(allocation.allocatedAmount)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </form.Field>
            )}

            <form.Field name="description">
              {(field) => (
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Description *
                  </label>
                  <input
                    type="text"
                    id="description"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., Groceries, Paycheck"
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="amount">
              {(field) => (
                <div>
                  <label
                    htmlFor="amount"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Amount *
                  </label>
                  <input
                    type="number"
                    id="amount"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="type">
              {(field) => (
                <div>
                  <label
                    htmlFor="type"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Type *
                  </label>
                  <select
                    id="type"
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(e.target.value as "income" | "expense")
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              )}
            </form.Field>

            <form.Field name="date">
              {(field) => (
                <div>
                  <label
                    htmlFor="date"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Date *
                  </label>
                  <input
                    type="date"
                    id="date"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              )}
            </form.Field>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!form.state.canSubmit || form.state.isSubmitting}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {form.state.isSubmitting ? "Adding..." : "Add Transaction"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};
