import React, { useState, useEffect } from "react";
import { useWallet } from "../hooks/useWallet";
import { requestAdvance, getRemainingSalary, CONTRACTS } from "../services/sorobanService";
import { sendLumens } from "../services/apiService";
import PayCycleProgress from "./PayCycleProgress";
import WithdrawForm from "./WithdrawForm";
import TransactionHistory from "./TransactionHistory";
import SendMoneyModal from "./SendMoneyModal";

const HomePage = () => {
  const {
    walletAddress,
    isConnecting,
    isConnected,
    error: walletError,
    isFreighterInstalled,
    checkingInstallation,
    connectWallet,
    disconnectWallet,
    formatAddress,
  } = useWallet();

  const [lastWithdrawalDate, setLastWithdrawalDate] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [monthlySalary] = useState(5000);
  const [employeeId] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);

  // Fetch employee data when wallet connects
  useEffect(() => {
    if (walletAddress) {
      fetchEmployeeData();
    }
  }, [walletAddress]);

  const fetchEmployeeData = async () => {
    try {
      setIsLoading(true);
      const remaining = await getRemainingSalary(walletAddress, employeeId);
      setAvailableBalance(remaining / 10000000); // Convert from stroops
    } catch (error) {
      console.error("Error fetching employee data:", error);
      // Use mock data for demo
      setAvailableBalance(3500);
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleWithdraw = async (amount) => {
    if (!walletAddress) {
      showNotification("Please connect your wallet first", "error");
      return;
    }

    setIsLoading(true);
    try {
      const amountInStroops = Math.floor(parseFloat(amount) * 10000000);
      
      const result = await requestAdvance(
        walletAddress,
        employeeId,
        amountInStroops,
        CONTRACTS.TOKEN
      );

      const fee = parseFloat(amount) * 0.0125;
      const netAmount = parseFloat(amount) - fee;

      setAvailableBalance((prev) => prev - parseFloat(amount));
      setLastWithdrawalDate(new Date());

      const newTransaction = {
        type: "Withdrawal",
        amount: netAmount,
        fee: fee,
        date: new Date().toISOString(),
        hash: result.hash,
        status: "completed",
      };

      setTransactions((prev) => [newTransaction, ...prev]);
      showNotification(`Successfully withdrew $${netAmount.toFixed(2)} (Fee: $${fee.toFixed(2)})`);
    } catch (error) {
      console.error("Withdrawal failed:", error);
      showNotification(error.message || "Withdrawal failed. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMoney = async (recipient, amount) => {
    setIsLoading(true);
    try {
      const result = await sendLumens(recipient, amount);
      
      const newTransaction = {
        type: "Send",
        amount: parseFloat(amount),
        recipient: recipient,
        date: new Date().toISOString(),
        hash: result.hash,
        status: "completed",
      };

      setTransactions((prev) => [newTransaction, ...prev]);
      showNotification(`Successfully sent ${amount} XLM to ${recipient.substring(0, 8)}...`);
      setShowSendModal(false);
    } catch (error) {
      console.error("Send failed:", error);
      showNotification(error.message || "Transfer failed. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden relative">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[128px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[100px] animate-pulse delay-500" />
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-2xl backdrop-blur-xl border transition-all duration-500 animate-slide-in ${
            notification.type === "error"
              ? "bg-red-500/20 border-red-500/30 text-red-200"
              : "bg-emerald-500/20 border-emerald-500/30 text-emerald-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{notification.type === "error" ? "⚠️" : "✓"}</span>
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 w-full border-b border-white/5 backdrop-blur-xl bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <span className="text-xl font-bold">S</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              StellarPay
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {isConnected && (
              <button
                onClick={() => setShowSendModal(true)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 flex items-center gap-2"
              >
                <span>💸</span>
                <span>Send XLM</span>
              </button>
            )}

            {isConnected ? (
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-300 font-mono text-sm">
                    {formatAddress(walletAddress)}
                  </span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 transition-all duration-300"
                  title="Disconnect"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="group relative px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-cyan-400 opacity-0 group-hover:opacity-20 transition-opacity" />
                <span className="relative font-semibold">
                  {isConnecting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Connecting...
                    </span>
                  ) : (
                    "Connect Wallet"
                  )}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {checkingInstallation ? (
          <div className="mb-8 p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <svg className="animate-spin h-8 w-8 text-blue-400" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <div>
                <h3 className="font-semibold text-blue-300">Checking for Freighter Wallet...</h3>
                <p className="text-blue-200/70 text-sm mt-1">
                  Please wait while we detect your wallet extension.
                </p>
              </div>
            </div>
          </div>
        ) : !isFreighterInstalled && !isConnected ? (
          <div className="mb-8 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🦊</span>
              <div>
                <h3 className="font-semibold text-amber-300">Freighter Wallet Required</h3>
                <p className="text-amber-200/70 text-sm mt-1">
                  Install Freighter wallet to access all features.{" "}
                  <a
                    href="https://freighter.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-300 underline hover:text-amber-200"
                  >
                    Get Freighter →
                  </a>
                  {" "}After installing, refresh this page. Or try clicking "Connect Wallet" if already installed.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {walletError && (
          <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300">
            {walletError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Balance Card */}
          <div className="lg:col-span-2">
            <div className="relative rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/10 to-cyan-600/20" />
              <div className="absolute inset-0 backdrop-blur-xl" />
              <div className="relative p-8 border border-white/10 rounded-3xl">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <p className="text-white/50 text-sm font-medium uppercase tracking-wider">
                      Available Balance
                    </p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-6xl font-bold bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-transparent">
                        ${availableBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-white/40 text-sm mt-2">
                      of ${monthlySalary.toLocaleString()} monthly salary
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs text-white/60">Testnet</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                  <div className="flex justify-between text-sm text-white/50 mb-2">
                    <span>Withdrawn</span>
                    <span>{((1 - availableBalance / monthlySalary) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${((monthlySalary - availableBalance) / monthlySalary) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Withdraw Form */}
                <WithdrawForm
                  onWithdraw={handleWithdraw}
                  maxAmount={availableBalance}
                  isLoading={isLoading}
                  isConnected={isConnected}
                />
              </div>
            </div>
          </div>

          {/* Pay Cycle Card */}
          <div className="lg:col-span-1">
            <PayCycleProgress lastWithdrawalDate={lastWithdrawalDate} />
          </div>

          {/* Transaction History */}
          <div className="lg:col-span-3">
            <TransactionHistory transactions={transactions} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <StatCard
            icon="📊"
            label="Fee Rate"
            value="1.25%"
            subtext="Per advance"
            color="violet"
          />
          <StatCard
            icon="⚡"
            label="Processing"
            value="~5 sec"
            subtext="Stellar network"
            color="cyan"
          />
          <StatCard
            icon="🔒"
            label="Contract"
            value="Verified"
            subtext="Soroban smart contract"
            color="emerald"
          />
        </div>
      </main>

      {/* Send Money Modal */}
      {showSendModal && (
        <SendMoneyModal
          onClose={() => setShowSendModal(false)}
          onSend={handleSendMoney}
          isLoading={isLoading}
        />
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/30 text-sm">
            Built on Stellar • Powered by Soroban Smart Contracts
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-white/30 hover:text-white/60 transition-colors text-sm">
              Documentation
            </a>
            <a href="#" className="text-white/30 hover:text-white/60 transition-colors text-sm">
              GitHub
            </a>
            <a href="#" className="text-white/30 hover:text-white/60 transition-colors text-sm">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon, label, value, subtext, color }) => {
  const colorClasses = {
    violet: "from-violet-500/20 to-violet-600/5 border-violet-500/20",
    cyan: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/20",
    emerald: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20",
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${colorClasses[color]} border backdrop-blur-xl p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/50 text-sm">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className="text-white/30 text-xs mt-1">{subtext}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
};

export default HomePage;
