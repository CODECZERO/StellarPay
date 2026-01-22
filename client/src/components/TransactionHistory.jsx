import React from "react";

const TransactionHistory = ({ transactions }) => {
  const getStatusBadge = (status) => {
    const statusStyles = {
      completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      failed: "bg-red-500/10 text-red-400 border-red-500/20",
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusStyles[status] || statusStyles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "Withdrawal": return "💸";
      case "Send": return "📤";
      case "Receive": return "📥";
      case "Deposit": return "🏦";
      default: return "💰";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateHash = (hash) => {
    if (!hash) return "—";
    return `${hash.substring(0, 8)}...${hash.slice(-8)}`;
  };

  return (
    <div className="rounded-2xl bg-[#111] border border-white/[0.08] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <span className="text-lg">📜</span>
          </div>
          <h2 className="text-lg font-semibold text-white">Transaction History</h2>
        </div>
        {transactions.length > 0 && (
          <span className="text-gray-600 text-sm">{transactions.length} transactions</span>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <span className="text-3xl opacity-50">📭</span>
          </div>
          <p className="text-gray-500 text-lg">No transactions yet</p>
          <p className="text-gray-700 text-sm mt-2">Your transaction history will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx, index) => (
            <div
              key={index}
              className="group p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-pink-400/30 transition-colors">
                    <span className="text-xl">{getTypeIcon(tx.type)}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{tx.type}</span>
                      {getStatusBadge(tx.status)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-600 text-sm">{formatDate(tx.date)}</span>
                      {tx.hash && (
                        <>
                          <span className="text-gray-700">•</span>
                          <a
                            href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pink-400/70 hover:text-pink-400 text-sm font-mono transition-colors"
                          >
                            {truncateHash(tx.hash)}
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`text-lg font-semibold ${
                      tx.type === "Receive" || tx.type === "Deposit"
                        ? "text-emerald-400"
                        : "text-white"
                    }`}
                  >
                    {tx.type === "Receive" || tx.type === "Deposit" ? "+" : "-"}$
                    {tx.amount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  {tx.fee > 0 && (
                    <p className="text-amber-400/70 text-xs mt-1">Fee: ${tx.fee.toFixed(2)}</p>
                  )}
                  {tx.recipient && (
                    <p className="text-gray-600 text-xs mt-1 font-mono">
                      To: {tx.recipient.substring(0, 8)}...
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
