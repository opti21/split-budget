import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Pencil, Trash2 } from "lucide-react";

interface TransactionListProps {
  cycleId: Id<"cycles">;
  periodId?: Id<"cyclePeriods">;
  onEditTransaction: (transaction: any) => void;
  onDeleteTransaction: (transactionId: Id<"transactions">) => void;
  cycleData: any; // Add cycleData prop
}

export function TransactionList({
  cycleId,
  periodId,
  onEditTransaction,
  onDeleteTransaction,
  cycleData, // Destructure cycleData
}: TransactionListProps) {
  const transactions = useQuery(api.transactions.getTransactionsForCycle, {
    cycleId,
  });

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

  const filteredTransactions = periodId
    ? transactions?.filter((tx) => tx.periodId === periodId) || []
    : transactions || [];

  if (transactions === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No transactions yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((transaction) => {
            const allocation = transaction.allocationId
              ? cycleData.allocations.find(
                  (alloc: any) => alloc._id === transaction.allocationId
                )
              : null;
            return (
              <div
                key={transaction._id}
                className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {transaction.description}
                    {allocation && (
                      <span className="text-sm text-gray-500 ml-2">({allocation.name})</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatDate(transaction.date)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className={`text-lg font-semibold ${
                      transaction.type === "income"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(transaction.amount)}
                  </div>
                  <button
                    onClick={() => onEditTransaction(transaction)}
                    className="text-blue-500 hover:text-blue-700"
                    title="Edit transaction"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onDeleteTransaction(transaction._id)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete transaction"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}