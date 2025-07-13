import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { CreateCycleModal } from "./CreateCycleModal";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface Cycle {
  _id: Id<"cycles">;
  name: string;
  startDate: number;
  endDate: number;
  totalPay: number; // Changed from totalIncome
  isActive: boolean;
  hasPeriods?: boolean;
  periodCount?: number;
}

export function CycleDashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  const allCycles = useQuery(api.cycles.getAllUserCycles, {});
  const deleteCycle = useMutation(api.cycles.deleteCycle);

  const handleCycleClick = (cycleId: Id<"cycles">) => {
    void navigate({ to: `/cycle/${cycleId}` });
  };

  const handleDeleteCycle = async (
    cycleId: Id<"cycles">,
    cycleName: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to delete the cycle "${cycleName}"? This action cannot be undone.`
      )
    )
      return;

    try {
      await deleteCycle({ cycleId });
      toast.success("Cycle deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete cycle");
      console.error(error);
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
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (start <= now && now <= end) {
      return `${formatDate(startDate)} - ${formatDate(endDate)} (Active)`;
    } else if (now < start) {
      return `${formatDate(startDate)} - ${formatDate(endDate)} (Upcoming)`;
    } else {
      return `${formatDate(startDate)} - ${formatDate(endDate)} (Past)`;
    }
  };

  if (allCycles === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Budget Cycles</h1>
          <p className="text-gray-600 mt-1">
            Create and manage cycles that match your irregular payment schedule
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors"
        >
          Create Cycle
        </button>
      </div>

      {allCycles.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🔄</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No cycles yet
          </h3>
          <p className="text-gray-600 mb-6">
            Create your first cycle to start managing your budget periods
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-hover transition-colors"
          >
            Create Your First Cycle
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allCycles.map((cycle: Cycle) => (
            <div
              key={cycle._id}
              className={`bg-white rounded-lg border hover:shadow-md transition-shadow cursor-pointer ${
                cycle.isActive
                  ? "border-primary bg-primary/5"
                  : "border-gray-200"
              }`}
              onClick={() => handleCycleClick(cycle._id)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {cycle.name}
                      </h3>
                      {cycle.isActive && (
                        <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      {cycle.hasPeriods && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {cycle.periodCount || 2} Splits
                        </span>
                      )}
                      <span className="text-sm text-gray-600">
                        {formatDateRange(cycle.startDate, cycle.endDate)}
                      </span>
                    </div>

                    <div className="text-lg font-semibold text-green-600">
                      {formatCurrency(cycle.totalPay)}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteCycle(cycle._id, cycle.name);
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Delete cycle"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateCycleModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
