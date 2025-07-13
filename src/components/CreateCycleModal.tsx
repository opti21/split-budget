import { useMutation } from "convex/react";
import { useForm } from "@tanstack/react-form";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useMemo } from "react";

interface CreateCycleModalProps {
  onClose: () => void;
}

interface Period {
  name: string;
  startDate: string;
  endDate: string;
  expectedIncome: number;
}

interface Allocation {
  periodNumber: number;
  name: string;
  allocatedAmount: number;
}

export function CreateCycleModal({ onClose }: CreateCycleModalProps) {
  const createCycle = useMutation(api.cycles.createCycle);
  const createCycleWithPeriods = useMutation(api.cycles.createCycleWithPeriods);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = today.getMonth(); // 0-based month for current month
  const payday = 11;
  // Default start date: 11th of this month
  const defaultStartDate = `${yyyy}-${String(mm + 1).padStart(2, "0")}-11`;
  // Last day of current month
  const lastDay = new Date(yyyy, mm + 1, 0).getDate();
  const period1End = `${yyyy}-${String(mm + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  // Next month/year for period 2
  let nextMonthNum = mm + 1;
  let nextMonthYear = yyyy;
  if (nextMonthNum > 11) {
    nextMonthNum = 0;
    nextMonthYear += 1;
  }
  const period2Start = `${nextMonthYear}-${String(nextMonthNum + 1).padStart(2, "0")}-01`;
  const period2End = `${nextMonthYear}-${String(nextMonthNum + 1).padStart(2, "0")}-10`;
  // Default end date: 10th of next month
  const defaultEndDate = period2End;

  const form = useForm({
    defaultValues: {
      name: "",
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      totalIncome: "", // Store as string for input flexibility
      periods: [
        {
          name: "First Half",
          startDate: defaultStartDate,
          endDate: period1End,
          expectedIncome: 0,
        },
        {
          name: "Second Half",
          startDate: period2Start,
          endDate: period2End,
          expectedIncome: 0,
        },
      ] as Period[],
      allocations: [
        { periodNumber: 1, name: "Rent", allocatedAmount: 0 },
        { periodNumber: 1, name: "Restaurants", allocatedAmount: 0 },
        { periodNumber: 1, name: "Groceries", allocatedAmount: 0 },
      ] as Allocation[],
    },
    onSubmit: async ({ value }) => {
      try {
        // Basic validation
        if (!value.name?.trim()) {
          toast.error("Cycle name is required");
          return;
        }
        if (!value.startDate) {
          toast.error("Start date is required");
          return;
        }
        if (!value.endDate) {
          toast.error("End date is required");
          return;
        }
        // Periods must be present and valid
        if (!value.periods || value.periods.length !== 2) {
          toast.error("Both periods are required.");
          return;
        }
        for (let i = 0; i < 2; i++) {
          const p = value.periods[i];
          if (!p.startDate || !p.endDate) {
            toast.error(`Period ${i + 1} must have a start and end date.`);
            return;
          }
        }
        const totalIncomeNum = parseFloat(value.totalIncome);
        if (isNaN(totalIncomeNum) || totalIncomeNum <= 0) {
          toast.error("Total income must be a number greater than 0");
          return;
        }
        if (new Date(value.endDate) <= new Date(value.startDate)) {
          toast.error("End date must be after start date");
          return;
        }

        const start = new Date(value.startDate);
        const end = new Date(value.endDate);

        // Only use allocations for period 1
        const firstPeriodAllocations = value.allocations.filter(
          (a: Allocation) => a.periodNumber === 1 && a.allocatedAmount > 0
        );
        const firstPeriodBudget = firstPeriodAllocations.reduce(
          (sum, a) => sum + a.allocatedAmount,
          0
        );
        const secondPeriodBudget = totalIncomeNum - firstPeriodBudget;
        const validPeriods = value.periods.map((p: Period, i: number) => ({
          name: p.name,
          startDate: new Date(p.startDate).getTime(),
          endDate: new Date(p.endDate).getTime(),
          budget: i === 0 ? firstPeriodBudget : secondPeriodBudget,
        }));

        await createCycleWithPeriods({
          name: value.name.trim(),
          startDate: start.getTime(),
          endDate: end.getTime(),
          totalPay: totalIncomeNum,
          periods: validPeriods,
          allocations: firstPeriodAllocations,
        });
        toast.success("Budget cycle created successfully!");
        onClose();
      } catch (error) {
        toast.error("Failed to create budget cycle");
        console.error(error);
      }
    },
  });

  // Auto-update period dates when startDate or endDate changes
  const { startDate, endDate, periods } = form.state.values;
  useMemo(() => {
    if (!startDate) return;
    const start = new Date(startDate);
    // Last day of current month for period 1
    const yyyy = start.getFullYear();
    const mm = start.getMonth();
    const period1Start = `${yyyy}-${String(mm + 1).padStart(2, "0")}-11`;
    const lastDay = new Date(yyyy, mm + 1, 0).getDate();
    const period1End = `${yyyy}-${String(mm + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    // Next month/year for period 2
    let nextMonthNum = mm + 1;
    let nextMonthYear = yyyy;
    if (nextMonthNum > 11) {
      nextMonthNum = 0;
      nextMonthYear += 1;
    }
    const period2Start = `${nextMonthYear}-${String(nextMonthNum + 1).padStart(2, "0")}-01`;
    const period2End = `${nextMonthYear}-${String(nextMonthNum + 1).padStart(2, "0")}-10`;
    const newEndDate = period2End;
    if (endDate !== newEndDate) {
      form.setFieldValue("endDate", newEndDate);
    }
    // Update periods
    if (
      periods[0].startDate !== period1Start ||
      periods[0].endDate !== period1End ||
      periods[1].startDate !== period2Start ||
      periods[1].endDate !== period2End
    ) {
      form.setFieldValue("periods", [
        {
          ...periods[0],
          startDate: period1Start,
          endDate: period1End,
        },
        {
          ...periods[1],
          startDate: period2Start,
          endDate: period2End,
        },
      ]);
    }
    // eslint-disable-next-line
  }, [startDate]);

  // Calculate budgets for display
  const allocations = form.state.values.allocations;
  const totalIncomeNum = parseFloat(form.state.values.totalIncome) || 0;
  const firstPeriodBudget = useMemo(
    () =>
      allocations
        .filter((a) => a.periodNumber === 1)
        .reduce((sum, a) => sum + (a.allocatedAmount || 0), 0),
    [allocations]
  );
  const secondPeriodBudget = totalIncomeNum - firstPeriodBudget;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-xl max-h-[80vh] flex flex-col">
        <div className="p-6 flex-1 overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Create Budget Cycle</h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void form.handleSubmit();
            }}
            className="space-y-4"
          >
            <form.Field name="name">
              {(field) => (
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Cycle Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., January 2024, Q1 2024, Mid-Month Payment"
                  />
                </div>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="startDate">
                {(field) => (
                  <div>
                    <label
                      htmlFor="startDate"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Start Date *
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="endDate">
                {(field) => (
                  <div>
                    <label
                      htmlFor="endDate"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      End Date *
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    {/* Move the quick set buttons here, below the End Date input */}
                    <form.Subscribe
                      selector={(state) => [state.values.startDate]}
                    >
                      {([startDate]) => (
                        <div className="flex gap-2 text-xs mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (startDate) {
                                const start = new Date(startDate);
                                const end = new Date(start);
                                end.setDate(start.getDate() + 14);
                                form.setFieldValue(
                                  "endDate",
                                  end.toISOString().split("T")[0]
                                );
                              }
                            }}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            +2 weeks
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (startDate) {
                                const start = new Date(startDate);
                                const end = new Date(start);
                                end.setDate(start.getDate() + 30);
                                form.setFieldValue(
                                  "endDate",
                                  end.toISOString().split("T")[0]
                                );
                              }
                            }}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            +1 month
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (startDate) {
                                const start = new Date(startDate);
                                const end = new Date(start);
                                end.setDate(start.getDate() + 90);
                                form.setFieldValue(
                                  "endDate",
                                  end.toISOString().split("T")[0]
                                );
                              }
                            }}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            +3 months
                          </button>
                        </div>
                      )}
                    </form.Subscribe>
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="totalIncome">
              {(field) => (
                <div>
                  <label
                    htmlFor="totalIncome"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Expected Total Income *
                  </label>
                  <input
                    type="number"
                    id="totalIncome"
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

            {/* Periods Configuration (always shown) */}
            <div className="border-t pt-4">
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Create multiple periods within your cycle where the budget for
                  later periods adjusts based on spending in earlier periods.
                </p>
                {/* Periods Configuration */}
                <div className="space-y-4">
                  <h3 className="font-medium">Periods</h3>
                  <form.Subscribe selector={(state) => [state.values.periods]}>
                    {([periods]) => (
                      <>
                        {periods.map((period: Period, index: number) => (
                          <div
                            key={index}
                            className="bg-gray-50 p-4 rounded-lg"
                          >
                            <div className="grid grid-cols-4 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Period {index + 1} Name
                                </label>
                                <input
                                  type="text"
                                  value={period.name}
                                  onChange={(e) => {
                                    const newPeriods = [...periods];
                                    newPeriods[index] = {
                                      ...newPeriods[index],
                                      name: e.target.value,
                                    };
                                    form.setFieldValue("periods", newPeriods);
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                  placeholder={`Period ${index + 1}`}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Start Date
                                </label>
                                <input
                                  type="date"
                                  value={period.startDate}
                                  onChange={(e) => {
                                    const newPeriods = [...periods];
                                    newPeriods[index] = {
                                      ...newPeriods[index],
                                      startDate: e.target.value,
                                    };
                                    form.setFieldValue("periods", newPeriods);
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  End Date
                                </label>
                                <input
                                  type="date"
                                  value={period.endDate}
                                  onChange={(e) => {
                                    const newPeriods = [...periods];
                                    newPeriods[index] = {
                                      ...newPeriods[index],
                                      endDate: e.target.value,
                                    };
                                    form.setFieldValue("periods", newPeriods);
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Expected Income
                                </label>
                                <input
                                  type="number"
                                  value={period.expectedIncome}
                                  onChange={(e) => {
                                    const newPeriods = [...periods];
                                    newPeriods[index] = {
                                      ...newPeriods[index],
                                      expectedIncome:
                                        parseFloat(e.target.value) || 0,
                                    };
                                    form.setFieldValue("periods", newPeriods);
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </form.Subscribe>
                </div>
                {/* Budget Allocations */}
                <div className="space-y-4">
                  <h3 className="font-medium">
                    Budget Allocations (Period 1 Only)
                  </h3>
                  <form.Subscribe
                    selector={(state) => [state.values.allocations]}
                  >
                    {([allocations]) => (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">Period 1</h4>
                            <button
                              type="button"
                              onClick={() => {
                                form.setFieldValue("allocations", [
                                  ...allocations,
                                  {
                                    periodNumber: 1,
                                    name: "",
                                    allocatedAmount: 0,
                                  },
                                ]);
                              }}
                              className="text-sm text-primary hover:text-primary-hover"
                            >
                              + Add Item
                            </button>
                          </div>
                          <div className="space-y-2">
                            {allocations
                              .filter((a: Allocation) => a.periodNumber === 1)
                              .map((allocation: Allocation) => {
                                const actualIndex = allocations.findIndex(
                                  (a: Allocation) => a === allocation
                                );
                                return (
                                  <div key={actualIndex} className="flex gap-2">
                                    <input
                                      type="text"
                                      value={allocation.name}
                                      onChange={(e) => {
                                        const newAllocations = [...allocations];
                                        newAllocations[actualIndex] = {
                                          ...newAllocations[actualIndex],
                                          name: e.target.value,
                                        };
                                        form.setFieldValue(
                                          "allocations",
                                          newAllocations
                                        );
                                      }}
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                      placeholder="Budget item name"
                                    />
                                    <input
                                      type="number"
                                      value={allocation.allocatedAmount}
                                      onChange={(e) => {
                                        const newAllocations = [...allocations];
                                        newAllocations[actualIndex] = {
                                          ...newAllocations[actualIndex],
                                          allocatedAmount:
                                            parseFloat(e.target.value) || 0,
                                        };
                                        form.setFieldValue(
                                          "allocations",
                                          newAllocations
                                        );
                                      }}
                                      className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                      min="0"
                                      step="0.01"
                                      placeholder="0.00"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        form.setFieldValue(
                                          "allocations",
                                          allocations.filter(
                                            (a: Allocation, i: number) =>
                                              i !== actualIndex
                                          )
                                        );
                                      }}
                                      className="px-2 py-2 text-red-500 hover:text-red-700"
                                    >
                                      ×
                                    </button>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="flex items-center gap-4">
                            <span className="font-medium">
                              Period 1 Budget:
                            </span>
                            <span>
                              {firstPeriodBudget.toLocaleString(undefined, {
                                style: "currency",
                                currency: "USD",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="font-medium">
                              Period 2 Budget:
                            </span>
                            <input
                              type="text"
                              value={secondPeriodBudget.toLocaleString(
                                undefined,
                                { style: "currency", currency: "USD" }
                              )}
                              readOnly
                              className="w-32 px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </form.Subscribe>
                </div>
              </div>
            </div>
          </form>
        </div>
        <div className="flex gap-3 p-6 border-t bg-white sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <button
                type="submit"
                onClick={(e) => {
                  e.preventDefault();
                  void form.handleSubmit();
                }}
                disabled={!canSubmit || isSubmitting}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Creating..." : "Create Cycle"}
              </button>
            )}
          </form.Subscribe>
        </div>
      </div>
    </div>
  );
}
