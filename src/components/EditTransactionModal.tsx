import { useMutation, useQuery } from "convex/react";
import { useForm } from "@tanstack/react-form";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface EditTransactionModalProps {
  transaction: {
    _id: Id<"transactions">;
    description: string;
    amount: number;
    type: "income" | "expense";
    date: number;
    cycleId: Id<"cycles">;
    periodId?: Id<"cyclePeriods">;
    allocationId?: Id<"periodAllocations">;
  };
  onClose: () => void;
}

export function EditTransactionModal({
  transaction,
  onClose,
}: EditTransactionModalProps) {
  const updateTransaction = useMutation(api.transactions.updateTransaction);
  const cycleData = useQuery(api.cycles.getCycleWithPeriods, { cycleId: transaction.cycleId });

  const form = useForm({
    defaultValues: {
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      date: new Date(transaction.date).toISOString().split("T")[0],
      allocationId: transaction.allocationId || "",
    },
    onSubmit: async ({ value }) => {
      try {
        if (!value.description?.trim()) {
          toast.error("Description is required");
          return;
        }
        if (value.amount <= 0) {
          toast.error("Amount must be greater than 0");
          return;
        }

        await updateTransaction({
          transactionId: transaction._id,
          description: value.description.trim(),
          amount: value.amount,
          type: value.type,
          date: new Date(value.date).getTime(),
          allocationId: value.allocationId === "" ? undefined : (value.allocationId as Id<"periodAllocations">),
        });

        toast.success("Transaction updated successfully!");
        onClose();
      } catch (error) {
        toast.error("Failed to update transaction");
        console.error(error);
      }
    },
  });

  const currentPeriod = transaction.periodId
    ? cycleData?.periods.find((p) => p._id === transaction.periodId)
    : undefined;

  const allocationsForPeriod = currentPeriod?.allocations || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Edit Transaction</h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void form.handleSubmit();
            }}
            className="space-y-4"
          >
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
                    onChange={(e) =>
                      field.handleChange(parseFloat(e.target.value) || 0)
                    }
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
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">None</option>
                      {allocationsForPeriod.map((allocation) => (
                        <option key={allocation._id} value={allocation._id}>
                          {allocation.name} (Allocated: {formatCurrency(allocation.allocatedAmount)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </form.Field>
            )}

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
                {form.state.isSubmitting ? "Updating..." : "Update Transaction"}
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
