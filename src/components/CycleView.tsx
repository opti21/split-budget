import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { AddTransactionModal } from "./AddTransactionModal";
import { AddAllocationModal } from "./AddAllocationModal";
import { EditAllocationModal } from "./EditAllocationModal";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Edit2,
} from "lucide-react";
import React from "react";
import { ViewTransactionsModal } from "@/components/ViewTransactionsModal";

interface CycleViewProps {
  cycleId: Id<"cycles">;
}

export function CycleView({ cycleId }: CycleViewProps) {
  const navigate = useNavigate();
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddAllocation, setShowAddAllocation] = useState(false);
  const [editingAllocation, setEditingAllocation] =
    useState<Id<"periodAllocations"> | null>(null);
  const [addTransactionPeriodId, setAddTransactionPeriodId] =
    useState<Id<"cyclePeriods"> | null>(null);
  const [addTransactionAllocationId, setAddTransactionAllocationId] =
    useState<Id<"periodAllocations"> | null>(null);
  const [viewTransactionsAllocationId, setViewTransactionsAllocationId] =
    useState<Id<"periodAllocations"> | null>(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [updatingBudget, setUpdatingBudget] = useState(false);

  const cycle = useQuery(api.cycles.getCycle, { cycleId });
  const transactions = useQuery(api.transactions.getCycleTransactions, {
    cycleId,
  });
  const allocations = useQuery(api.cycles.getCycleAllocations, { cycleId });
  const cycleWithPeriods = useQuery(api.cycles.getCycleWithPeriods, {
    cycleId,
  });
  const updateTotalPay = useMutation(api.cycles.updateTotalPay);

  const deleteCycle = useMutation(api.cycles.deleteCycle);

  const handleBackClick = () => {
    void navigate({ to: "/" });
  };

  const handleDeleteCycle = async () => {
    if (!cycle) return;

    if (
      !confirm(
        `Are you sure you want to delete the cycle "${cycle.name}"? This action cannot be undone.`
      )
    )
      return;

    try {
      await deleteCycle({ cycleId });
      toast.success("Cycle deleted successfully!");
      void navigate({ to: "/" });
    } catch (error) {
      toast.error("Failed to delete cycle");
      console.error(error);
    }
  };

  const handleEditBudget = () => {
    if (!cycle) return;
    setBudgetInput(cycle.totalPay.toString());
    setEditingBudget(true);
  };
  const handleBudgetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBudgetInput(e.target.value);
  };
  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newBudget = parseFloat(budgetInput);
    if (isNaN(newBudget) || newBudget < 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }
    setUpdatingBudget(true);
    try {
      await updateTotalPay({ cycleId, totalPay: newBudget });
      toast.success("Total budget updated");
      setEditingBudget(false);
    } catch (error) {
      toast.error("Failed to update budget");
      console.error(error);
    } finally {
      setUpdatingBudget(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateRange = (startDate: number, endDate: number) => {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  // Compute used/overused for each allocation
  const getAllocationUsed = (allocationId: Id<"periodAllocations">) => {
    return (
      transactions
        ?.filter(
          (t: any) => t.allocationId === allocationId && t.type === "expense"
        )
        .reduce((sum: number, t: any) => sum + t.amount, 0) || 0
    );
  };

  React.useEffect(() => {
    if (!viewTransactionsAllocationId) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewTransactionsAllocationId(null);
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [viewTransactionsAllocationId]);

  if (
    cycle === undefined ||
    transactions === undefined ||
    allocations === undefined
  ) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (cycle === null) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Cycle Not Found
        </h2>
        <p className="text-gray-600 mb-6">
          The cycle you're looking for doesn't exist.
        </p>
        <button
          onClick={handleBackClick}
          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const totalAllocated =
    allocations?.reduce(
      (sum: number, allocation: any) => sum + allocation.allocatedAmount,
      0
    ) || 0;

  const remainingBudget = cycle.totalPay - totalAllocated;

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackClick}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Go back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{cycle.name}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDateRange(cycle.startDate, cycle.endDate)}
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  {formatCurrency(cycle.totalPay)}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => void handleDeleteCycle()}
            className="text-red-600 hover:text-red-800 px-4 py-2 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete Cycle
          </button>
        </div>

        {/* Budget Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Budget</p>
                {editingBudget ? (
                  <form
                    onSubmit={(e) => {
                      void handleBudgetSubmit(e);
                    }}
                    className="flex items-center gap-2 mt-1"
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={budgetInput}
                      onChange={handleBudgetInputChange}
                      className="border rounded px-2 py-1 w-28 text-gray-800"
                      disabled={updatingBudget}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="bg-primary text-white px-2 py-1 rounded hover:bg-primary/90 transition-colors text-sm"
                      disabled={updatingBudget}
                    >
                      {updatingBudget ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      className="text-gray-500 px-2 py-1 rounded hover:bg-gray-100 text-sm"
                      onClick={() => setEditingBudget(false)}
                      disabled={updatingBudget}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-gray-800">
                      {formatCurrency(cycle.totalPay)}
                    </p>
                    <button
                      onClick={handleEditBudget}
                      className="ml-1 p-1 rounded hover:bg-gray-100"
                      title="Edit total budget"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                )}
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Allocated</p>
                <p className="text-2xl font-bold text-gray-800">
                  {formatCurrency(totalAllocated)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Remaining</p>
                <p
                  className={`text-2xl font-bold ${remainingBudget >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatCurrency(remainingBudget)}
                </p>
              </div>
              <div
                className={`p-3 rounded-full ${remainingBudget >= 0 ? "bg-green-100" : "bg-red-100"}`}
              >
                <TrendingDown
                  className={`w-6 h-6 ${remainingBudget >= 0 ? "text-green-600" : "text-red-600"}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Allocations - now grouped by period */}
        {cycleWithPeriods &&
          Array.isArray(cycleWithPeriods.periods) &&
          cycleWithPeriods.periods.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Budget Allocations by Period
              </h2>
              <div className="space-y-8">
                {Array.isArray(cycleWithPeriods.periods) &&
                  cycleWithPeriods.periods.map((period: any) => {
                    const periodAllocations = Array.isArray(
                      cycleWithPeriods.allocations
                    )
                      ? cycleWithPeriods.allocations.filter(
                          (a: any) => a.periodId === period._id
                        )
                      : [];
                    return (
                      <div key={period._id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium text-gray-800">
                              {period.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {formatDate(period.startDate)} -{" "}
                              {formatDate(period.endDate)}
                            </div>
                          </div>
                          <button
                            onClick={() => setShowAddAllocation(true)}
                            className="bg-primary text-white px-3 py-1 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" /> Add Allocation
                          </button>
                        </div>
                        {periodAllocations.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">
                            No allocations for this period.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {periodAllocations.map((allocation: any) => {
                              const used = getAllocationUsed(allocation._id);
                              const over = used - allocation.allocatedAmount;
                              const usage =
                                allocation.allocatedAmount > 0
                                  ? used / allocation.allocatedAmount
                                  : 0;
                              return (
                                <div
                                  key={allocation._id}
                                  className="relative flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors overflow-hidden"
                                >
                                  {/* Progress background */}
                                  <div
                                    className={`absolute left-0 top-0 h-full transition-all duration-300 ${usage > 1 ? "bg-red-200" : "bg-primary/20"}`}
                                    style={{
                                      width: `${Math.min(usage * 100, 100)}%`,
                                      zIndex: 0,
                                    }}
                                  />
                                  <div className="relative z-10 w-full flex items-center justify-between">
                                    <div>
                                      <h3 className="font-medium text-gray-800">
                                        {allocation.name}
                                      </h3>
                                      <p className="text-sm text-gray-600">
                                        Allocated:{" "}
                                        {formatCurrency(
                                          allocation.allocatedAmount
                                        )}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        Used: {formatCurrency(used)}
                                        {over > 0 && (
                                          <span className="ml-2 text-red-600 font-semibold">
                                            Over: {formatCurrency(over)}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() =>
                                          setEditingAllocation(allocation._id)
                                        }
                                        className="text-primary hover:text-primary/80 px-3 py-1 rounded hover:bg-primary/10 transition-colors"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => {
                                          setAddTransactionPeriodId(
                                            allocation.periodId
                                          );
                                          setAddTransactionAllocationId(
                                            allocation._id
                                          );
                                        }}
                                        className="bg-primary text-white px-3 py-1 rounded hover:bg-primary/90 transition-colors"
                                      >
                                        <Plus className="w-4 h-4" /> Add
                                        Transaction
                                      </button>
                                      <button
                                        onClick={() =>
                                          setViewTransactionsAllocationId(
                                            allocation._id
                                          )
                                        }
                                        className="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300 transition-colors"
                                      >
                                        View Transactions
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

        {/* Per-Period Add Transaction Buttons */}
        {cycleWithPeriods &&
          Array.isArray(cycleWithPeriods.periods) &&
          cycleWithPeriods.periods.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Periods
              </h2>
              <div className="space-y-4">
                {cycleWithPeriods.periods.map((period: any) => (
                  <div
                    key={period._id}
                    className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {period.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(period.startDate)} -{" "}
                        {formatDate(period.endDate)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                        <div>
                          <span className="font-medium">Budget:</span>{" "}
                          {formatCurrency(period.budget)}
                        </div>
                        <div>
                          <span className="font-medium">Allocated:</span>{" "}
                          {formatCurrency(period.totalAllocated ?? 0)}
                        </div>
                        <div>
                          <span className="font-medium">Spent:</span>{" "}
                          {formatCurrency(period.totalSpent ?? 0)}
                        </div>
                        <div>
                          <span className="font-medium">Remaining:</span>{" "}
                          {formatCurrency(period.remainingBudget ?? 0)}
                        </div>
                      </div>
                    </div>
                    <button
                      className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                      onClick={() => setAddTransactionPeriodId(period._id)}
                    >
                      <Plus className="w-4 h-4" /> Add Transaction to this
                      Period
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Transactions */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Transactions
            </h2>
            <button
              onClick={() => setShowAddTransaction(true)}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Transaction
            </button>
          </div>

          <div className="space-y-3">
            {transactions?.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No transactions yet. Add your first transaction to get started.
              </p>
            ) : (
              transactions?.map((transaction) => (
                <div
                  key={transaction._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <h3 className="font-medium text-gray-800">
                      {transaction.description}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {formatDate(transaction.date)} • {transaction.type}
                    </p>
                  </div>
                  <span
                    className={`font-semibold ${
                      transaction.type === "income"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {editingAllocation &&
        allocations &&
        (() => {
          const allocation = allocations.find(
            (a: any) => a._id === editingAllocation
          );
          if (!allocation) return null;
          return (
            <EditAllocationModal
              allocation={allocation}
              onClose={() => setEditingAllocation(null)}
            />
          );
        })()}
      {showAddAllocation && (
        <AddAllocationModal
          cycleId={cycleId}
          onClose={() => setShowAddAllocation(false)}
        />
      )}
      {showAddTransaction && (
        <AddTransactionModal
          cycleId={cycleId}
          onClose={() => setShowAddTransaction(false)}
        />
      )}
      {addTransactionPeriodId && (
        <AddTransactionModal
          cycleId={cycleId}
          periodId={addTransactionPeriodId}
          allocationId={addTransactionAllocationId ?? undefined}
          onClose={() => {
            setAddTransactionPeriodId(null);
            setAddTransactionAllocationId(null);
          }}
        />
      )}
      {viewTransactionsAllocationId && (
        <ViewTransactionsModal
          allocationId={viewTransactionsAllocationId}
          transactions={transactions}
          onClose={() => setViewTransactionsAllocationId(null)}
          formatCurrency={formatCurrency}
        />
      )}
    </>
  );
}
