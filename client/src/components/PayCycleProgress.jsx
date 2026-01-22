import React, { useState, useEffect } from "react";

const PayCycleProgress = ({ lastWithdrawalDate }) => {
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
  });
  const [progress, setProgress] = useState(0);

  const cycleLength = 15; // 15-day pay cycle

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      
      // Calculate next payday (15th or end of month)
      let nextPayday = new Date(now.getFullYear(), now.getMonth(), 15);
      if (now.getDate() > 15) {
        // Move to end of month
        nextPayday = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
      if (now > nextPayday) {
        // Move to 15th of next month
        nextPayday = new Date(now.getFullYear(), now.getMonth() + 1, 15);
      }

      const timeDiff = nextPayday - now;
      const daysRemaining = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hoursRemaining = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesRemaining = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining({
        days: Math.max(0, daysRemaining),
        hours: Math.max(0, hoursRemaining),
        minutes: Math.max(0, minutesRemaining),
      });

      // Calculate progress
      const elapsedDays = cycleLength - daysRemaining;
      const progressPercentage = Math.min((elapsedDays / cycleLength) * 100, 100);
      setProgress(progressPercentage);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [lastWithdrawalDate]);

  const isPayday = timeRemaining.days === 0 && timeRemaining.hours === 0;

  return (
    <div className="relative rounded-3xl overflow-hidden h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-cyan-600/10 to-violet-600/20" />
      <div className="absolute inset-0 backdrop-blur-xl" />
      <div className="relative p-8 border border-white/10 rounded-3xl h-full flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <span className="text-xl">📅</span>
          </div>
          <h2 className="text-lg font-semibold text-white/90">Pay Cycle</h2>
        </div>

        {isPayday ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <span className="text-6xl mb-4">🎉</span>
            <h3 className="text-2xl font-bold text-emerald-400">It's Payday!</h3>
            <p className="text-white/50 mt-2">Your salary has been deposited</p>
          </div>
        ) : (
          <>
            {/* Countdown */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <TimeUnit value={timeRemaining.days} label="Days" />
              <TimeUnit value={timeRemaining.hours} label="Hours" />
              <TimeUnit value={timeRemaining.minutes} label="Mins" />
            </div>

            {/* Circular Progress */}
            <div className="flex-1 flex items-center justify-center">
              <div className="relative w-36 h-36">
                <svg className="w-full h-full transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="72"
                    cy="72"
                    r="64"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="72"
                    cy="72"
                    r="64"
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 64}`}
                    strokeDashoffset={`${2 * Math.PI * 64 * (1 - progress / 100)}`}
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="50%" stopColor="#06B6D4" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                    {Math.round(progress)}%
                  </span>
                  <span className="text-white/40 text-xs">Complete</span>
                </div>
              </div>
            </div>

            {/* Next Payday Info */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Next Payday</span>
                <span className="text-white/90 text-sm font-medium">
                  {timeRemaining.days} day{timeRemaining.days !== 1 ? "s" : ""} remaining
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const TimeUnit = ({ value, label }) => (
  <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
    <span className="text-2xl font-bold text-white">{String(value).padStart(2, "0")}</span>
    <span className="block text-white/40 text-xs mt-1">{label}</span>
  </div>
);

export default PayCycleProgress;
