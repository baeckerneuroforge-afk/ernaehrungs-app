"use client";

import { useState, useEffect } from "react";
import { Users, MessageSquare, UtensilsCrossed, BookOpen, TrendingUp, Calendar } from "lucide-react";

interface Stats {
  total_users: number;
  total_messages: number;
  total_meal_plans: number;
  total_documents: number;
  conversations_today: number;
  conversations_week: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then(setStats);
  }, []);

  const cards = stats
    ? [
        {
          label: "Nutzer",
          value: stats.total_users,
          icon: Users,
          color: "text-primary",
          bg: "bg-primary-bg",
        },
        {
          label: "Fragen heute",
          value: stats.conversations_today,
          icon: Calendar,
          color: "text-accent-warm",
          bg: "bg-orange-50",
        },
        {
          label: "Fragen diese Woche",
          value: stats.conversations_week,
          icon: TrendingUp,
          color: "text-primary-soft",
          bg: "bg-green-50",
        },
        {
          label: "Nachrichten gesamt",
          value: stats.total_messages,
          icon: MessageSquare,
          color: "text-blue-500",
          bg: "bg-blue-50",
        },
        {
          label: "Ernährungspläne",
          value: stats.total_meal_plans,
          icon: UtensilsCrossed,
          color: "text-primary",
          bg: "bg-primary-bg",
        },
        {
          label: "Wissensbasis-Dokumente",
          value: stats.total_documents,
          icon: BookOpen,
          color: "text-gray-500",
          bg: "bg-gray-50",
        },
      ]
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Dashboard</h1>
      <p className="text-gray-500 text-sm mb-8">
        Übersicht über Nutzer, Gespräche und Aktivitäten.
      </p>

      {!stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse"
            >
              <div className="h-4 bg-gray-100 rounded w-20 mb-3" />
              <div className="h-8 bg-gray-100 rounded w-12" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-gray-100 p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}
                >
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <span className="text-xs text-gray-400">{card.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
