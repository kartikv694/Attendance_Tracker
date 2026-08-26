"use client";

import { useEffect, useState } from "react";

type QRCountdownProps = {
  expiresAt: string;
};

export function QRCountdown({ expiresAt }: QRCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Expired");
        setIsExpired(true);
      } else {
        const seconds = Math.floor((diff / 1000) % 60);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
        setIsExpired(false);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div
      className={`rounded-lg p-4 text-center mb-4 ${
        isExpired ? "bg-red-100 border border-red-300" : "bg-emerald-100 border border-emerald-300"
      }`}
    >
      <div className="text-sm text-slate-600">Time remaining:</div>
      <div
        className={`text-3xl font-bold font-mono ${
          isExpired ? "text-red-600" : "text-emerald-600"
        }`}
      >
        {timeLeft}
      </div>
    </div>
  );
}
