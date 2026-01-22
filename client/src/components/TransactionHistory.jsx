import React from "react";

const TransactionHistory = ({ transactions }) => {
  const getStatusBadge = (status) => {
    const statusStyles = {
      completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      failed: "bg-red-500/20 text-red-400 border-red-500/30",
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusStyles[status] || statusStyles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "Withdrawal":
        return "💸";
      case "Send":
        return "📤";
      case "Receive":
        return "📥";
      case "Deposit":
        return "🏦";
      default:
        return "💰";
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
    <div className="relative rounded-3xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-white/[0.01]" />
      <div className="absolute inset-0 backdrop-blur-xl" />
      <div className="relative p-8 border border-white/10 rounded-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center">
              <span className="text-xl">📜</span>
            </div>
            <h2 className="text-lg font-semibold text-white/90">Transaction History</h2>
          </div>
          {transactions.length > 0 && (
            <span className="text-white/40 text-sm">{transactions.length} transactions</span>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <span className="text-4xl opacity-50">📭</span>
            </div>
            <p className="text-white/40 text-lg">No transactions yet</p>
            <p className="text-white/20 text-sm mt-2">
              Your transaction history will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx, index) => (
              <div
                key={index}
                className="group p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-white/10 flex items-center justify-center group-hover:border-violet-500/30 transition-colors">
                      <span className="text-2xl">{getTypeIcon(tx.type)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{tx.type}</span>
                        {getStatusBadge(tx.status)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-white/40 text-sm">{formatDate(tx.date)}</span>
                        {tx.hash && (
                          <>
                            <span className="text-white/20">•</span>
                            <a
                              href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-violet-400/70 hover:text-violet-400 text-sm font-mono transition-colors"
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
                      className={`text-xl font-bold ${
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
                      <p className="text-amber-400/70 text-xs mt-1">
                        Fee: ${tx.fee.toFixed(2)}
                      </p>
                    )}
                    {tx.recipient && (
                      <p className="text-white/30 text-xs mt-1 font-mono">
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
    </div>
  );
};

export default TransactionHistory;

