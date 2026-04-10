"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Check,
  Sparkles,
  Crown,
  Loader2,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  Infinity as InfinityIcon,
} from "lucide-react";
import { CreditTopupModal } from "@/components/credit-topup-modal";

type Plan = "free" | "pro" | "pro_plus" | "admin";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

interface Props {
  plan: Plan;
  isAdmin: boolean;
  creditsSubscription: number;
  creditsTopup: number;
  planLimit: number;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  creditsResetAt: string | null;
  hasSubscription: boolean;
}

const PLAN_META: Record<
  Plan,
  {
    label: string;
    price: string;
    credits: number | string;
    badgeClass: string;
    icon: typeof Sparkles;
  }
> = {
  free: {
    label: "Free",
    price: "Kostenlos",
    credits: 15,
    badgeClass: "bg-surface-muted text-ink-muted border-border",
    icon: Sparkles,
  },
  pro: {
    label: "Basis",
    price: "15,99 € / Monat",
    credits: 100,
    badgeClass: "bg-primary-pale text-primary border-primary/30",
    icon: TrendingUp,
  },
  pro_plus: {
    label: "Premium",
    price: "49,99 € / Monat",
    credits: 400,
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Crown,
  },
  admin: {
    label: "Admin",
    price: "Unbegrenzt",
    credits: "∞",
    badgeClass: "bg-primary-pale text-primary border-primary/30",
    icon: InfinityIcon,
  },
};

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function BillingClient({
  plan,
  isAdmin,
  creditsSubscription,
  creditsTopup,
  planLimit,
  periodEnd,
  cancelAtPeriodEnd,
  creditsResetAt,
  hasSubscription,
}: Props) {
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [topupOpen, setTopupOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/history")
      .then((r) => (r.ok ? r.json() : { transactions: [] }))
      .then((data) => setHistory(data.transactions || []))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, []);

  const meta = PLAN_META[plan];
  const PlanIcon = meta.icon;

  const totalCredits = isAdmin
    ? Infinity
    : (creditsSubscription || 0) + (creditsTopup || 0);
  const subUsed = isAdmin ? 0 : Math.max(planLimit - creditsSubscription, 0);
  const subPct =
    planLimit > 0 ? Math.min((subUsed / planLimit) * 100, 100) : 0;

  async function handleUpgrade(target: "pro" | "pro_plus") {
    setUpgrading(target);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: target, interval: "monthly" }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setUpgrading(null);
    } catch {
      setUpgrading(null);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setCancelMessage(
          `Kündigung bestätigt. Dein Zugang bleibt bis ${
            fmtDate(data.period_end) || "zum Periodenende"
          } aktiv.`
        );
        setCancelOpen(false);
      } else {
        setCancelMessage(data.error || "Kündigung fehlgeschlagen.");
      }
    } catch {
      setCancelMessage("Kündigung fehlgeschlagen.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-ink">Abo & Billing</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Verwalte deinen Plan, deine Credits und deine Zahlungen.
        </p>
      </div>

      {/* Current Plan Card */}
      <div
        className={`bg-white rounded-2xl border shadow-card p-6 mb-6 ${
          plan === "pro" || plan === "pro_plus" || plan === "admin"
            ? "border-primary/30"
            : "border-border"
        }`}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${meta.badgeClass}`}
              >
                <PlanIcon className="w-3 h-3" />
                {meta.label}
              </span>
              {cancelAtPeriodEnd && (
                <span className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-full px-2.5 py-1">
                  Kündigung aktiv
                </span>
              )}
            </div>
            <h2 className="font-serif text-2xl text-ink">
              {plan === "free"
                ? "Du nutzt den kostenlosen Plan"
                : `${meta.label}-Plan`}
            </h2>
            <p className="text-sm text-ink-muted mt-1">{meta.price}</p>
            {periodEnd && !cancelAtPeriodEnd && (
              <p className="text-xs text-ink-faint mt-2 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                Nächste Abrechnung: {fmtDate(periodEnd)}
              </p>
            )}
            {periodEnd && cancelAtPeriodEnd && (
              <p className="text-xs text-red-600 mt-2 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                Zugang bis: {fmtDate(periodEnd)}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {plan === "free" && (
              <button
                onClick={() => handleUpgrade("pro")}
                disabled={!!upgrading}
                className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-full px-5 py-2.5 transition disabled:opacity-60"
              >
                {upgrading === "pro" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUpRight className="w-4 h-4" />
                )}
                Jetzt upgraden
              </button>
            )}
            {plan === "pro" && (
              <button
                onClick={() => handleUpgrade("pro_plus")}
                disabled={!!upgrading}
                className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-full px-5 py-2.5 transition disabled:opacity-60"
              >
                {upgrading === "pro_plus" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Crown className="w-4 h-4" />
                )}
                Upgrade auf Premium
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Credits Overview */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <h3 className="font-serif text-lg text-ink">Credits</h3>
          </div>
          <button
            onClick={() => setTopupOpen(true)}
            className="bg-primary hover:bg-primary-hover text-white text-xs font-medium rounded-full px-4 py-2 transition"
          >
            Credits nachkaufen
          </button>
        </div>

        {isAdmin ? (
          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-serif text-3xl text-ink flex items-center gap-2">
              <InfinityIcon className="w-7 h-7 text-primary" />
              Unbegrenzt
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-serif text-3xl text-ink">
                {totalCredits}
              </span>
              <span className="text-sm text-ink-muted">
                von {planLimit} verfügbar
              </span>
            </div>
            <div className="h-2 bg-surface-muted rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${100 - subPct}%` }}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-border bg-surface-muted/50 p-3">
                <div className="text-ink-muted mb-0.5">Abo-Credits</div>
                <div className="font-medium text-ink">
                  {creditsSubscription} Credits
                </div>
                {creditsResetAt && (
                  <div className="text-ink-faint mt-1">
                    Reset: {fmtDate(creditsResetAt)}
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-border bg-surface-muted/50 p-3">
                <div className="text-ink-muted mb-0.5">Top-Up-Credits</div>
                <div className="font-medium text-ink">
                  {creditsTopup} Credits
                </div>
                <div className="text-ink-faint mt-1">Verfallen nie</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Plan Comparison */}
      {!isAdmin && (
        <div className="mb-6">
          <h3 className="font-serif text-lg text-ink mb-3">Alle Pläne</h3>
          <div className="grid md:grid-cols-3 gap-3">
            <PlanCard
              name="Free"
              price="0 €"
              priceSub="für immer"
              credits={15}
              features={["Chat", "Tagebuch", "Tracker"]}
              active={plan === "free"}
              actionLabel={plan === "free" ? undefined : undefined}
              onAction={undefined}
            />
            <PlanCard
              name="Basis"
              price="15,99 €"
              priceSub="/ Monat"
              credits={100}
              features={[
                "Alles aus Free",
                "Haiku KI-Modell (1 Credit/Chat)",
                "Ernährungsplan",
                "Wochenreview (Basic)",
              ]}
              active={plan === "pro"}
              actionLabel={
                plan === "free"
                  ? "Upgrade auf Basis"
                  : plan === "pro"
                  ? undefined
                  : undefined
              }
              onAction={plan === "free" ? () => handleUpgrade("pro") : undefined}
              loading={upgrading === "pro"}
              highlight
            />
            <PlanCard
              name="Premium"
              price="49,99 €"
              priceSub="/ Monat"
              credits={400}
              features={[
                "Alles aus Basis",
                "Sonnet KI-Modell (Premium-Qualität)",
                "Foto-Tracking: Essen fotografieren",
                "Restaurant-Guide: Speisekarte fotografieren",
                "Monatlicher Fortschrittsreport",
                "Voller Wochenreview",
                "Janine direkt",
              ]}
              active={plan === "pro_plus"}
              actionLabel={
                plan !== "pro_plus" ? "Upgrade auf Premium" : undefined
              }
              onAction={
                plan !== "pro_plus" ? () => handleUpgrade("pro_plus") : undefined
              }
              loading={upgrading === "pro_plus"}
              gold
            />
          </div>
          <p className="text-xs text-ink-faint mt-3 text-center">
            Zum Downgraden kontaktiere bitte unseren{" "}
            <a href="/support" className="text-primary hover:underline">
              Support
            </a>
            .
          </p>
        </div>
      )}

      {/* Payment history */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 mb-6">
        <h3 className="font-serif text-lg text-ink mb-4">Zahlungshistorie</h3>
        {loadingHistory ? (
          <div className="text-sm text-ink-faint">Wird geladen …</div>
        ) : history.length === 0 ? (
          <div className="text-sm text-ink-faint text-center py-6">
            Noch keine Transaktionen.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="text-xs text-ink-faint border-b border-border">
                  <th className="text-left font-medium px-6 py-2">Datum</th>
                  <th className="text-left font-medium px-6 py-2">
                    Beschreibung
                  </th>
                  <th className="text-right font-medium px-6 py-2">Credits</th>
                </tr>
              </thead>
              <tbody>
                {history.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-6 py-3 text-ink-muted whitespace-nowrap">
                      {fmtDate(tx.created_at)}
                    </td>
                    <td className="px-6 py-3 text-ink">
                      {tx.description ||
                        (tx.type === "subscription_grant"
                          ? "Abo-Credits"
                          : "Top-Up")}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-primary whitespace-nowrap">
                      +{tx.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel */}
      {hasSubscription && !isAdmin && !cancelAtPeriodEnd && (
        <div className="text-center mb-10">
          <button
            onClick={() => setCancelOpen(true)}
            className="text-xs text-ink-faint hover:text-red-600 transition underline-offset-4 hover:underline"
          >
            Plan kündigen
          </button>
        </div>
      )}

      {cancelMessage && (
        <div className="bg-primary-pale border border-primary/20 rounded-xl px-4 py-3 text-sm text-primary text-center mb-6">
          {cancelMessage}
        </div>
      )}

      {/* Cancel dialog */}
      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !cancelling && setCancelOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-serif text-xl text-ink mb-2">
              Plan wirklich kündigen?
            </h3>
            <p className="text-sm text-ink-muted mb-5">
              Dein Zugang bleibt bis{" "}
              <strong>{fmtDate(periodEnd) || "zum Periodenende"}</strong>{" "}
              bestehen. Danach wechselst du automatisch auf den Free-Plan (15
              Credits / Monat).
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setCancelOpen(false)}
                disabled={cancelling}
                className="text-sm text-ink-muted hover:text-ink px-4 py-2 rounded-full transition"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-full px-5 py-2 transition disabled:opacity-60"
              >
                {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                Ja, kündigen
              </button>
            </div>
          </div>
        </div>
      )}

      <CreditTopupModal open={topupOpen} onClose={() => setTopupOpen(false)} />
    </>
  );
}

function PlanCard({
  name,
  price,
  priceSub,
  credits,
  features,
  active,
  actionLabel,
  onAction,
  loading,
  highlight,
  gold,
}: {
  name: string;
  price: string;
  priceSub: string;
  credits: number;
  features: string[];
  active: boolean;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
  highlight?: boolean;
  gold?: boolean;
}) {
  const borderCls = active
    ? "border-primary ring-1 ring-primary/20"
    : highlight
    ? "border-primary/30"
    : gold
    ? "border-amber-200"
    : "border-border";

  return (
    <div
      className={`bg-white rounded-2xl border shadow-card p-5 flex flex-col ${borderCls}`}
    >
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-serif text-lg text-ink">{name}</h4>
          {active && (
            <span className="text-[10px] font-medium bg-primary-pale text-primary px-2 py-0.5 rounded-full">
              Aktiv
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-serif text-2xl text-ink">{price}</span>
          <span className="text-xs text-ink-muted">{priceSub}</span>
        </div>
      </div>
      <div className="text-xs text-ink-muted mb-3">
        <strong className="text-ink">{credits}</strong> Credits / Monat
      </div>
      <ul className="space-y-2 text-xs text-ink-muted mb-4 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-1.5">
            <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-medium rounded-full px-4 py-2 transition disabled:opacity-60"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {actionLabel}
        </button>
      )}
    </div>
  );
}
