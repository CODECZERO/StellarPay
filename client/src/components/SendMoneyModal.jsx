import React, { useState } from "react";

const SendMoneyModal = ({ onClose, onSend, isLoading }) => {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const validateStellarAddress = (address) => {
    // Basic validation: Stellar addresses start with G and are 56 characters
    return address.startsWith("G") && address.length === 56;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!recipient) {
      setError("Please enter a recipient address");
      return;
    }

    if (!validateStellarAddress(recipient)) {
      setError("Invalid Stellar address. Must start with 'G' and be 56 characters.");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    onSend(recipient, amount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/10 to-cyan-600/20 rounded-3xl" />
        <div className="absolute inset-0 backdrop-blur-xl rounded-3xl" />
        <div className="relative bg-[#0a0a0f]/90 border border-white/10 rounded-3xl p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <span className="text-xl">💸</span>
              </div>
              <h2 className="text-xl font-bold text-white">Send XLM</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Recipient Input */}
            <div>
              <label className="block text-white/50 text-sm mb-2">Recipient Address</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value.toUpperCase())}
                placeholder="G..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white placeholder-white/20 font-mono text-sm focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-white/50 text-sm mb-2">Amount (XLM)</label>
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d*\.?\d*$/.test(val)) {
                      setAmount(val);
                    }
                  }}
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-xl font-semibold text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 font-medium">
                  XLM
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                ⚠️ {error}
              </div>
            )}

            {/* Info Box */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-start gap-3">
                <span className="text-lg">ℹ️</span>
                <div className="text-sm text-white/50">
                  <p>This will send XLM from the backend wallet to the specified address on Stellar Testnet.</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 rounded-xl font-semibold bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-4 rounded-xl font-bold bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  "Send XLM"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SendMoneyModal;

