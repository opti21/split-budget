import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { CreateCycleModal } from "./CreateCycleModal";

interface CycleManagerProps {
  budgetId: Id<"budgets">;
}

export function CycleManager({ budgetId }: CycleManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<Id<"cycles"> | null>(
    null
  );

  const cycles = useQuery(api.cycles.getBudgetCycles, { budgetId });
  const cycleWithPeriods = useQuery(
    api.cycles.getCycleWithPeriods,
    selectedCycleId ? { cycleId: selectedCycleId } : "skip"
  );
  const deleteCycle = useMutation(api.cycles.deleteCycle);

  if (cycles === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleCycleClick = (cycleId: Id<"cycles">) => {
    setSelectedCycleId(cycleId === selectedCycleId ? null : cycleId);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Budget Cycles</h2>
          <p className="text-gray-600 text-sm mt-1">
            Organize your budget into payment periods that match your income
            schedule
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors"
        >
          Create Cycle
        </button>
      </div>

      {cycles.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🔄</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No budget cycles yet
          </h3>
          <p className="text-gray-600 mb-6">
            Create budget cycles to match your irregular payment schedule
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-hover transition-colors"
          >
            Create Your First Cycle
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {cycles.map((cycle) => (
            <div
              key={cycle._id}
              className={`bg-white rounded-lg border ${
                cycle.isActive
                  ? "border-primary bg-primary/5"
                  : "border-gray-200"
              }`}
            >
              <div
                className="p-6 cursor-pointer"
                onClick={() => handleCycleClick(cycle._id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {cycle.name}
                      </h3>
                      {cycle.isActive && (
                        <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                          Active
                        </span>
                      )}
                      {cycle.hasPeriods && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          Split Budget
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Start Date:</span>
                        <p className="font-medium">
                          {formatDate(cycle.startDate)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">End Date:</span>
                        <p className="font-medium">
                          {formatDate(cycle.endDate)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Income:</span>
                        <p className="font-medium text-green-600">
                          {formatCurrency(cycle.totalIncome)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            "Are you sure you want to delete this cycle? This will also delete all related periods and allocations."
                          )
                        ) {
                          void deleteCycle({ cycleId: cycle._id }).then(() => {
                            if (selectedCycleId === cycle._id)
                              setSelectedCycleId(null);
                          });
                        }
                      }}
                      className="text-red-500 hover:text-red-700 px-2 py-1 rounded"
                      title="Delete cycle"
                    >
                      🗑️
                    </button>
                    <span className="text-gray-400">
                      {selectedCycleId === cycle._id ? "−" : "+"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    Duration:{" "}
                    {Math.ceil(
                      (cycle.endDate - cycle.startDate) / (1000 * 60 * 60 * 24)
                    )}{" "}
                    days
                    {cycle.hasPeriods && ` • ${cycle.periodCount} periods`}
                  </div>
                </div>
              </div>

              {/* Expanded Period Details */}
              {selectedCycleId === cycle._id && cycleWithPeriods && (
                <div className="border-t bg-gray-50">
                  {cycleWithPeriods.periods.length > 0 ? (
                    <div className="p-6 space-y-6">
                      <h4 className="font-semibold text-gray-900 mb-4">
                        Period Budget Breakdown
                      </h4>

                      {cycleWithPeriods.periods.map((period, index) => (
                        <div
                          key={period._id}
                          className="bg-white rounded-lg p-4 border"
                        >
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <h5 className="font-medium text-gray-900">
                                {period.name}
                              </h5>
                              <p className="text-sm text-gray-600">
                                {formatDate(period.startDate)} -{" "}
                                {formatDate(period.endDate)}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-600">
                                Available Budget
                              </div>
                              <div className="text-lg font-semibold text-green-600">
                                {formatCurrency(period.availableBudget)}
                              </div>
                            </div>
                          </div>

                          {/* Budget Summary */}
                          <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                            <div className="text-center p-3 bg-blue-50 rounded">
                              <div className="text-gray-600">
                                Expected Income
                              </div>
                              <div className="font-medium text-blue-600">
                                {formatCurrency(period.expectedIncome)}
                              </div>
                            </div>
                            <div className="text-center p-3 bg-orange-50 rounded">
                              <div className="text-gray-600">Carry-Over</div>
                              <div className="font-medium text-orange-600">
                                {formatCurrency(
                                  period.carryOverFromPrevious || 0
                                )}
                              </div>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded">
                              <div className="text-gray-600">Remaining</div>
                              <div className="font-medium text-green-600">
                                {formatCurrency(period.remainingBudget)}
                              </div>
                            </div>
                          </div>

                          {/* Allocation Details */}
                          {period.allocations.length > 0 && (
                            <div className="space-y-2">
                              <h6 className="font-medium text-gray-700 mb-2">
                                Budget Allocations
                              </h6>
                              <div className="space-y-1">
                                {period.allocations.map((allocation) => (
                                  <div
                                    key={allocation._id}
                                    className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded"
                                  >
                                    <span className="text-sm text-gray-700">
                                      {allocation.name}
                                    </span>
                                    <div className="flex items-center gap-4 text-sm">
                                      <div className="text-gray-600">
                                        Budgeted:{" "}
                                        {formatCurrency(
                                          allocation.allocatedAmount
                                        )}
                                      </div>
                                      <div className="text-gray-600">
                                        Spent:{" "}
                                        {formatCurrency(
                                          allocation.actualSpent || 0
                                        )}
                                      </div>
                                      <div
                                        className={`font-medium ${
                                          allocation.allocatedAmount -
                                            (allocation.actualSpent || 0) >=
                                          0
                                            ? "text-green-600"
                                            : "text-red-600"
                                        }`}
                                      >
                                        Left:{" "}
                                        {formatCurrency(
                                          allocation.allocatedAmount -
                                            (allocation.actualSpent || 0)
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-gray-500">
                      <p>This cycle doesn't have split periods.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateCycleModal
          budgetId={budgetId}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
