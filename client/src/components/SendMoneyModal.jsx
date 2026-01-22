import React, { useState } from "react";

const SendMoneyModal = ({ onClose, onSend, isLoading }) => {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const validateStellarAddress = (address) => {
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center">
              <span className="text-lg">💸</span>
            </div>
            <h2 className="text-xl font-bold text-white">Send XLM</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Recipient Input */}
          <div>
            <label className="block text-gray-500 text-sm mb-2">Recipient Address</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.toUpperCase())}
              placeholder="G..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white placeholder-gray-700 font-mono text-sm focus:outline-none focus:border-pink-400/50 focus:ring-1 focus:ring-pink-400/20 transition-all"
            />
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-gray-500 text-sm mb-2">Amount (XLM)</label>
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
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-xl font-medium text-white placeholder-gray-700 focus:outline-none focus:border-pink-400/50 focus:ring-1 focus:ring-pink-400/20 transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-medium">
                XLM
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Info Box */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="flex items-start gap-3">
              <span className="text-lg">ℹ️</span>
              <p className="text-sm text-gray-500">
                This will send XLM from the backend wallet to the specified address on Stellar Testnet.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-xl font-semibold bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-4 rounded-xl font-semibold bg-gradient-to-r from-pink-400 to-purple-400 text-black hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
};

export default SendMoneyModal;
