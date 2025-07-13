import React, { useEffect } from "react";

interface ViewTransactionsModalProps {
  allocationId: string;
  transactions: any[];
  onClose: () => void;
  formatCurrency: (amount: number) => string;
}

export const ViewTransactionsModal: React.FC<ViewTransactionsModalProps> = ({
  allocationId,
  transactions,
  onClose,
  formatCurrency,
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  const filtered = (transactions || []).filter(
    (t: any) => t.allocationId === allocationId
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Transactions for Budget
          </h2>
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            title="Close"
          >
            ×
          </button>
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No transactions for this budget allocation.
              </p>
            ) : (
              filtered.map((t: any) => (
                <div
                  key={t._id}
                  className="border rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-gray-50"
                >
                  <div>
                    <div className="font-medium text-gray-800">
                      {t.description}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(t.date).toLocaleDateString()} • {t.type}
                    </div>
                  </div>
                  <div
                    className={`font-semibold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}
                  >
                    {t.type === "income" ? "+" : "-"}
                    {formatCurrency(t.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
