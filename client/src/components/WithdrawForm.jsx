import React, { useState } from "react";

const WithdrawForm = ({ onWithdraw, maxAmount, isLoading, isConnected }) => {
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  const presetAmounts = [100, 250, 500, 1000];

  const handlePresetClick = (preset) => {
    setIsCustom(false);
    setAmount(preset.toString());
    setCustomAmount("");
  };

  const handleCustomChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setCustomAmount(value);
      setAmount(value);
      setIsCustom(true);
    }
  };

  const handleWithdraw = () => {
    const withdrawAmount = parseFloat(amount);
    if (!withdrawAmount || withdrawAmount <= 0) return;
    if (withdrawAmount > maxAmount) return;
    onWithdraw(withdrawAmount);
    setAmount("");
    setCustomAmount("");
    setIsCustom(false);
  };

  const selectedAmount = parseFloat(amount) || 0;
  const fee = selectedAmount * 0.0125;
  const netAmount = selectedAmount - fee;
  const isValidAmount = selectedAmount > 0 && selectedAmount <= maxAmount;

  return (
    <div className="space-y-6">
      {/* Preset Amount Buttons */}
      <div>
        <p className="text-gray-500 text-sm mb-3">Quick Select</p>
        <div className="grid grid-cols-4 gap-3">
          {presetAmounts.map((preset) => (
            <button
              key={preset}
              onClick={() => handlePresetClick(preset)}
              disabled={preset > maxAmount || !isConnected}
              className={`py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                amount === preset.toString() && !isCustom
                  ? "bg-gradient-to-r from-pink-400 to-purple-400 text-black"
                  : preset > maxAmount
                  ? "bg-white/5 text-gray-700 cursor-not-allowed"
                  : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10"
              }`}
            >
              ${preset}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Amount Input */}
      <div>
        <p className="text-gray-500 text-sm mb-3">Or Enter Custom Amount</p>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-lg">$</span>
          <input
            type="text"
            value={customAmount}
            onChange={handleCustomChange}
            placeholder="0.00"
            disabled={!isConnected}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-10 pr-20 text-xl font-medium text-white placeholder-gray-700 focus:outline-none focus:border-pink-400/50 focus:ring-1 focus:ring-pink-400/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={() => {
              setCustomAmount(maxAmount.toFixed(2));
              setAmount(maxAmount.toFixed(2));
              setIsCustom(true);
            }}
            disabled={!isConnected}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold text-pink-400 bg-pink-400/10 rounded-lg hover:bg-pink-400/20 transition-colors disabled:opacity-50"
          >
            MAX
          </button>
        </div>
      </div>

      {/* Fee Breakdown */}
      {selectedAmount > 0 && (
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Requested Amount</span>
            <span className="text-white">${selectedAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Processing Fee (1.25%)</span>
            <span className="text-amber-400">-${fee.toFixed(2)}</span>
          </div>
          <div className="border-t border-white/10 pt-3 flex justify-between">
            <span className="text-gray-400 font-medium">You'll Receive</span>
            <span className="text-xl font-bold text-pink-400">
              ${netAmount.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {selectedAmount > maxAmount && (
        <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-sm">
          ⚠️ Amount exceeds your available balance of ${maxAmount.toFixed(2)}
        </div>
      )}

      {/* Withdraw Button */}
      <button
        onClick={handleWithdraw}
        disabled={!isValidAmount || isLoading || !isConnected}
        className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
          isValidAmount && isConnected
            ? "bg-gradient-to-r from-pink-400 to-purple-400 text-black hover:opacity-90"
            : "bg-white/5 text-gray-600 cursor-not-allowed"
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-3">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </span>
        ) : !isConnected ? (
          "Connect Wallet to Withdraw"
        ) : (
          `Withdraw ${selectedAmount > 0 ? `$${netAmount.toFixed(2)}` : ""}`
        )}
      </button>
    </div>
  );
};

export default WithdrawForm;
