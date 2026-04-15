"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  Palette,
  ShieldCheck,
  User as UserIcon,
  Sun,
  Moon,
  Monitor,
  CreditCard,
  LifeBuoy,
  ArrowUpRight,
  Check,
  Loader2,
  RotateCcw,
  Upload,
} from "lucide-react";

type Theme = "light" | "dark" | "system";

interface NotificationPreferences {
  tagebuch_reminder: { enabled: boolean; time: string };
  review_reminder: { enabled: boolean };
  credit_warning_email: { enabled: boolean };
}

interface Props {
  initialPreferences: NotificationPreferences;
  initialTheme: Theme;
}

const TIME_PRESETS = ["08:00", "12:00", "18:00", "20:00"];

export function SettingsClient({ initialPreferences, initialTheme }: Props) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPreferences>(initialPreferences);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [tourReset, setTourReset] = useState(false);

  async function replayTour() {
    await fetch("/api/profile/tour-done", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true }),
    });
    setTourReset(true);
    // Bounce to /chat so the tour actually runs
    router.push("/chat");
  }

  // Apply theme to <html> immediately and persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("theme", theme);
      const root = document.documentElement;
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const dark = theme === "dark" || (theme === "system" && prefersDark);
      root.classList.toggle("dark", dark);
    } catch {
      // noop — SSR / permission errors
    }
  }, [theme]);

  // Listen for system changes when in 'system' mode
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle("dark", e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  async function persist(next: Partial<{ notification_preferences: NotificationPreferences; theme: Theme }>) {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        setSavedAt(Date.now());
      }
    } finally {
      setSaving(false);
    }
  }

  function updatePref<K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    persist({ notification_preferences: next });
  }

  function updateTheme(next: Theme) {
    setTheme(next);
    persist({ theme: next });
  }

  const showSaved = savedAt && Date.now() - savedAt < 2500;

  return (
    <div className="space-y-5">
      {/* Save indicator */}
      <div className="h-5 flex items-center justify-end text-xs text-ink-muted">
        {saving ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            Speichern…
          </span>
        ) : showSaved ? (
          <span className="inline-flex items-center gap-1.5 text-primary">
            <Check className="w-3 h-3" />
            Gespeichert
          </span>
        ) : null}
      </div>

      {/* 1. Benachrichtigungen */}
      <Card
        title="Benachrichtigungen"
        icon={<Bell className="w-4 h-4 text-primary" />}
        description="Kleine Erinnerungen, damit du dranbleibst."
      >
        {/* Tagebuch reminder */}
        <ToggleRow
          label="Tagebuch-Erinnerung"
          description="Tägliche Erinnerung, deine Mahlzeiten einzutragen."
          checked={prefs.tagebuch_reminder.enabled}
          onChange={(enabled) =>
            updatePref("tagebuch_reminder", { ...prefs.tagebuch_reminder, enabled })
          }
        />
        {prefs.tagebuch_reminder.enabled && (
          <div className="mt-3 pl-1">
            <label className="block text-xs font-medium text-ink-muted mb-2">
              Uhrzeit
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {TIME_PRESETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    updatePref("tagebuch_reminder", { enabled: true, time: t })
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    prefs.tagebuch_reminder.time === t
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-ink-muted border-border hover:border-primary/40"
                  }`}
                >
                  {t}
                </button>
              ))}
              <input
                type="time"
                value={prefs.tagebuch_reminder.time}
                onChange={(e) =>
                  updatePref("tagebuch_reminder", { enabled: true, time: e.target.value })
                }
                className="rounded-full border border-border bg-surface-muted px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>
          </div>
        )}

        <Divider />

        <ToggleRow
          label="Wochenreview-Erinnerung"
          description="Sonntags eine Erinnerung an deinen Wochenrückblick."
          checked={prefs.review_reminder.enabled}
          onChange={(enabled) => updatePref("review_reminder", { enabled })}
        />

        <Divider />

        <ToggleRow
          label="Credit-Warnung per E-Mail"
          description="E-Mail, wenn deine Credits fast aufgebraucht sind."
          checked={prefs.credit_warning_email.enabled}
          onChange={(enabled) => updatePref("credit_warning_email", { enabled })}
        />
      </Card>

      {/* 2. Darstellung */}
      <Card
        title="Darstellung"
        icon={<Palette className="w-4 h-4 text-primary" />}
        description="Hell, dunkel oder nach Systemeinstellung."
      >
        <div className="grid grid-cols-3 gap-2">
          <ThemePill
            label="Hell"
            icon={<Sun className="w-4 h-4" />}
            active={theme === "light"}
            onClick={() => updateTheme("light")}
          />
          <ThemePill
            label="Dunkel"
            icon={<Moon className="w-4 h-4" />}
            active={theme === "dark"}
            onClick={() => updateTheme("dark")}
          />
          <ThemePill
            label="System"
            icon={<Monitor className="w-4 h-4" />}
            active={theme === "system"}
            onClick={() => updateTheme("system")}
          />
        </div>
      </Card>

      {/* 3. Datenschutz */}
      <Card
        title="Datenschutz"
        icon={<ShieldCheck className="w-4 h-4 text-primary" />}
        description="Einwilligungen und rechtliche Informationen."
      >
        <p className="text-sm text-ink-muted leading-relaxed mb-3">
          Die Einwilligung zur Qualitätssicherung (Gesprächsfreigabe für unser Team)
          verwaltest du in deinem Profil.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/profil"
            className="inline-flex items-center gap-1.5 bg-primary-pale text-primary hover:bg-primary/15 rounded-full px-4 py-2 text-sm font-medium transition"
          >
            Zu den Einwilligungen
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/datenschutz"
            className="inline-flex items-center gap-1.5 text-ink-muted hover:text-primary rounded-full px-4 py-2 text-sm transition"
          >
            Datenschutzerklärung
          </Link>
          <Link
            href="/impressum"
            className="inline-flex items-center gap-1.5 text-ink-muted hover:text-primary rounded-full px-4 py-2 text-sm transition"
          >
            Impressum
          </Link>
        </div>
      </Card>

      {/* 4. Konto */}
      <Card
        title="Konto"
        icon={<UserIcon className="w-4 h-4 text-primary" />}
        description="Abo, Support und Kontoverwaltung."
      >
        <div className="space-y-2">
          <LinkRow
            href="/billing"
            icon={<CreditCard className="w-4 h-4 text-primary" />}
            label="Abo & Credits verwalten"
            description="Plan ändern, Rechnungen, Credits nachkaufen"
          />
          <LinkRow
            href="/support"
            icon={<LifeBuoy className="w-4 h-4 text-primary" />}
            label="Hilfe & Support"
            description="Kontakt aufnehmen und häufige Fragen"
          />
          <LinkRow
            href="/einstellungen/import"
            icon={<Upload className="w-4 h-4 text-primary" />}
            label="Daten importieren"
            description="CSV aus MyFitnessPal, Yazio, Lifesum & mehr"
          />
          <button
            type="button"
            onClick={replayTour}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary-faint transition group text-left"
          >
            <div className="w-9 h-9 rounded-full bg-primary-pale flex items-center justify-center flex-shrink-0">
              <RotateCcw className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink">
                Onboarding-Tour nochmal anzeigen
              </div>
              <div className="text-xs text-ink-muted truncate">
                {tourReset
                  ? "Wird beim nächsten Chat-Besuch gestartet…"
                  : "Zurück zum Walkthrough mit den wichtigsten Features"}
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-ink-faint group-hover:text-primary group-hover:translate-x-0.5 transition" />
          </button>
        </div>
        <p className="text-xs text-ink-faint mt-4 leading-relaxed">
          Konto löschen? Das findest du in deinem{" "}
          <Link href="/profil" className="text-primary hover:underline">
            Profil
          </Link>{" "}
          unter „Gefahrenzone&ldquo;.
        </p>
      </Card>
    </div>
  );
}

function Card({
  title,
  icon,
  description,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-border shadow-card p-5 sm:p-6">
      <div className="flex items-start gap-2.5 mb-4">
        <div className="mt-0.5">{icon}</div>
        <div>
          <h2 className="font-serif text-lg text-ink leading-tight">{title}</h2>
          {description && (
            <p className="text-xs text-ink-muted mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function Divider() {
  return <div className="my-4 border-t border-border" />;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-ink">{label}</h3>
        <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
        checked ? "bg-primary" : "bg-surface-muted border border-border"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function ThemePill({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-sm transition ${
        active
          ? "bg-primary text-white border-primary shadow-card"
          : "bg-white text-ink-muted border-border hover:border-primary/40"
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function LinkRow({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary-faint transition group"
    >
      <div className="w-9 h-9 rounded-full bg-primary-pale flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink">{label}</div>
        <div className="text-xs text-ink-muted truncate">{description}</div>
      </div>
      <ArrowUpRight className="w-4 h-4 text-ink-faint group-hover:text-primary group-hover:translate-x-0.5 transition" />
    </Link>
  );
}
