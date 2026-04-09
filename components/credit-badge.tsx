"use client";

import { useEffect, useState } from "react";
import { Coins, Infinity as InfinityIcon } from "lucide-react";

interface CreditData {
  total: number;
  credits_subscription: number;
  credits_topup: number;
  plan: string;
  plan_limit: number;
  isAdmin?: boolean;
}

export function CreditBadge({
  onClick,
  isAdmin,
}: {
  onClick?: () => void;
  isAdmin?: boolean;
}) {
  const [data, setData] = useState<CreditData | null>(null);

  useEffect(() => {
    fetch("/api/credits")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return null;

  const unlimited = isAdmin || data.isAdmin || data.total === -1;

  if (unlimited) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-primary-pale text-primary hover:bg-primary/15 transition"
        title="Admin – unlimitierte Credits"
      >
        <InfinityIcon className="w-3 h-3" />
        Admin
      </button>
    );
  }

  const isLow = data.total <= 3;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition ${
        isLow
          ? "bg-red-50 text-red-600 hover:bg-red-100"
          : "bg-primary-bg text-primary hover:bg-primary-pale"
      }`}
    >
      <Coins className="w-3 h-3" />
      {data.total} Credits
    </button>
  );
}
