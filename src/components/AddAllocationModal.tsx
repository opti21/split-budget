import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

import { useQuery } from "convex/react";
import { useEffect } from "react";

interface AddAllocationModalProps {
  cycleId: Id<"cycles">;
  onClose: () => void;
}

export function AddAllocationModal({
  cycleId,
  onClose,
}: AddAllocationModalProps) {
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

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const cycleWithPeriods = useQuery(api.cycles.getCycleWithPeriods, {
    cycleId,
  });

  // Auto-select the first period if there is at least one and none is selected
  useEffect(() => {
    if (
      cycleWithPeriods &&
      Array.isArray(cycleWithPeriods.periods) &&
      cycleWithPeriods.periods.length > 0 &&
      selectedPeriodId === ""
    ) {
      setSelectedPeriodId(cycleWithPeriods.periods[0]._id);
    }
  }, [cycleWithPeriods, selectedPeriodId]);

  const addAllocation = useMutation(api.cycles.addAllocation);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriodId || !name.trim() || !amount || parseFloat(amount) <= 0)
      return;

    setIsLoading(true);
    try {
      await addAllocation({
        periodId: selectedPeriodId as Id<"cyclePeriods">,
        cycleId,
        name: name.trim(),
        allocatedAmount: parseFloat(amount),
      });
      toast.success("Budget item added successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to add budget item");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

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
          <h2 className="text-xl font-semibold mb-4">Add Budget Item</h2>

          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            className="space-y-4"
          >
            {/* Period selection dropdown */}
            {cycleWithPeriods &&
              Array.isArray(cycleWithPeriods.periods) &&
              cycleWithPeriods.periods.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Period *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={selectedPeriodId}
                    onChange={(e) => {
                      setSelectedPeriodId(e.target.value);
                    }}
                    required
                  >
                    <option value="">-- Select Period --</option>
                    {cycleWithPeriods.periods.map((period: any) => (
                      <option key={period._id} value={period._id}>
                        {period.name} (
                        {new Date(period.startDate).toLocaleDateString()} -{" "}
                        {new Date(period.endDate).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            {/* Auto-select handled by useEffect */}

            {/* Only show the rest of the form if a period is selected */}
            {selectedPeriodId && (
              <>
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Item Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., Rent, Groceries, Entertainment"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="amount"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Allocated Amount *
                  </label>
                  <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

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
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    {isLoading ? "Adding..." : "Add Item"}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
