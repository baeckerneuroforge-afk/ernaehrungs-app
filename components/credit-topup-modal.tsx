"use client";

import { useState } from "react";
import { X, Coins, Zap, Star } from "lucide-react";

const PACKAGES = [
  { key: "small", credits: 30, price: "2,99", icon: Coins, label: "Starter", popular: false },
  { key: "medium", credits: 75, price: "5,99", icon: Zap, label: "Beliebt", popular: true },
  { key: "large", credits: 200, price: "12,99", icon: Star, label: "Beste Wahl", popular: false },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreditTopupModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  async function handleBuy(pkg: string) {
    setLoading(pkg);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/stripe/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: pkg }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (res.status === 503) {
        setErrorMsg(
          "Credit-Käufe sind gerade nicht verfügbar. Bitte versuche es später erneut.",
        );
      } else if (data?.message) {
        setErrorMsg(data.message);
      }
    } catch {
      setErrorMsg("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary-bg flex items-center justify-center mx-auto mb-3">
            <Coins className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-warm-dark">Credits nachladen</h2>
          <p className="text-sm text-warm-muted mt-1">
            Wähle ein Paket um weiterzumachen
          </p>
        </div>

        <div className="space-y-3">
          {PACKAGES.map((pkg) => {
            const Icon = pkg.icon;
            return (
              <button
                key={pkg.key}
                onClick={() => handleBuy(pkg.key)}
                disabled={loading !== null}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition text-left ${
                  pkg.popular
                    ? "border-primary bg-primary-bg/30 hover:bg-primary-bg/50"
                    : "border-gray-200 hover:border-primary/30 hover:bg-gray-50"
                } ${loading === pkg.key ? "opacity-60" : ""}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  pkg.popular ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-warm-dark">{pkg.credits} Credits</span>
                    {pkg.popular && (
                      <span className="text-[10px] font-medium bg-primary text-white px-1.5 py-0.5 rounded-full">
                        BELIEBT
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-warm-muted">{pkg.label}</span>
                </div>
                <span className="font-semibold text-warm-dark">{pkg.price} €</span>
              </button>
            );
          })}
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            {errorMsg}
          </div>
        )}

        <p className="text-xs text-warm-light text-center mt-4">
          Top-Up Credits verfallen nicht und werden nach Abo-Credits verbraucht.
        </p>
      </div>
    </div>
  );
}
