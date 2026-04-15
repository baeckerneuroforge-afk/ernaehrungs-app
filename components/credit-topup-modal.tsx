"use client";

import { useState } from "react";
import { X, Coins, Loader2 } from "lucide-react";

const PACKAGES = [
  { key: "small", credits: 15, price: "2,99", perCredit: "0,20", label: "Nachschub", badge: null },
  { key: "medium", credits: 40, price: "5,99", perCredit: "0,15", label: "Spar-Paket", badge: "Beliebt" },
  { key: "large", credits: 100, price: "11,99", perCredit: "0,12", label: "Mega-Paket", badge: "Bester Wert" },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreditTopupModal({ open, onClose }: Props) {
  const [selected, setSelected] = useState("medium");
  const [loading, setLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  async function handleBuy() {
    setLoading(selected);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/stripe/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: selected }),
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

  const selectedPkg = PACKAGES.find((p) => p.key === selected)!;

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

        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-xl bg-primary-bg flex items-center justify-center mx-auto mb-3">
            <Coins className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-warm-dark">Credits nachladen</h2>
          <p className="text-sm text-warm-muted mt-1">
            Wähle ein Paket
          </p>
        </div>

        <div className="space-y-2.5">
          {PACKAGES.map((pkg) => {
            const isSelected = selected === pkg.key;
            return (
              <button
                key={pkg.key}
                onClick={() => setSelected(pkg.key)}
                disabled={loading !== null}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition text-left relative ${
                  isSelected
                    ? "border-primary bg-primary-bg/30 shadow-sm"
                    : "border-gray-100 hover:border-primary/30 hover:bg-gray-50/50"
                } ${loading !== null ? "opacity-70" : ""}`}
              >
                {/* Badge */}
                {pkg.badge && (
                  <span className={`absolute -top-2.5 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    pkg.badge === "Beliebt"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {pkg.badge}
                  </span>
                )}

                {/* Radio indicator */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected ? "border-primary" : "border-gray-300"
                }`}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-warm-dark text-base">{pkg.credits} Credits</span>
                    <span className="text-[10px] text-warm-light">€{pkg.perCredit}/Credit</span>
                  </div>
                  <span className="text-xs text-warm-muted">{pkg.label}</span>
                </div>

                {/* Price */}
                <span className="font-semibold text-warm-dark text-base flex-shrink-0">{pkg.price} €</span>
              </button>
            );
          })}
        </div>

        {/* Buy button */}
        <button
          onClick={handleBuy}
          disabled={loading !== null}
          className="w-full mt-5 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-3.5 rounded-full text-sm font-semibold transition shadow-card disabled:opacity-60"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Wird geladen...</>
          ) : (
            `${selectedPkg.credits} Credits für ${selectedPkg.price} € kaufen`
          )}
        </button>

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
