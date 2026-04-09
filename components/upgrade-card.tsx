"use client";

import Link from "next/link";
import { Lock, Sparkles, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface UpgradeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref?: string;
  requiredPlan?: "pro" | "pro_plus";
}

export function UpgradeCard({
  icon: Icon,
  title,
  description,
  features,
  ctaLabel,
  ctaHref = "/#pricing",
  requiredPlan = "pro",
}: UpgradeCardProps) {
  const planLabel = requiredPlan === "pro_plus" ? "Premium" : "Basis";

  return (
    <div className="bg-white rounded-2xl border border-primary-pale shadow-card overflow-hidden animate-fade-in">
      {/* Accent strip */}
      <div className="h-1 bg-gradient-to-r from-primary to-primary-hover" />

      <div className="p-6 sm:p-8">
        {/* Icon with lock overlay */}
        <div className="relative w-14 h-14 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-primary-pale flex items-center justify-center">
            <Icon className="w-7 h-7 text-primary" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-primary-pale flex items-center justify-center shadow-sm">
            <Lock className="w-3 h-3 text-primary" />
          </div>
        </div>

        <h2 className="font-serif text-2xl text-ink mb-2">{title}</h2>
        <p className="text-ink-muted text-sm leading-relaxed mb-5">
          {description}
        </p>

        {/* Feature bullets */}
        <ul className="space-y-2.5 mb-6">
          {features.map((feat) => (
            <li key={feat} className="flex items-start gap-2.5 text-sm text-ink">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-pale flex items-center justify-center mt-0.5">
                <Check className="w-3 h-3 text-primary" strokeWidth={3} />
              </div>
              <span>{feat}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Link
          href={ctaHref}
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-primary hover:bg-primary-hover text-white rounded-full px-6 py-3 font-medium shadow-card transition-all duration-200 hover:-translate-y-0.5"
        >
          <Sparkles className="w-4 h-4" />
          {ctaLabel}
        </Link>

        <p className="text-xs text-ink-faint mt-3">
          {planLabel}-Plan erforderlich
        </p>
      </div>
    </div>
  );
}
