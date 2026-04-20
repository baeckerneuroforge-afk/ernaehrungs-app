"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Check } from "lucide-react";

interface Props {
  items: string[];
  interactive?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  "Obst & Gemüse": "🥬 Obst & Gemüse",
  "Milchprodukte": "🥩 Kühlregal",
  "Getreide & Brot": "🍝 Trockenwaren & Getreide",
  "Protein": "🥩 Protein",
  "Gewürze & Öle": "🧂 Gewürze & Öle",
  "Sonstiges": "📦 Sonstiges",
};

// Dezenter Farbakzent pro Kategorie — nur auf den Header (Icon + Text),
// NICHT auf die ganze Box. Bleibt im warm/erdigen Spektrum.
const CATEGORY_ACCENT: Record<string, string> = {
  "Obst & Gemüse": "text-emerald-700 dark:text-emerald-300",
  "Milchprodukte": "text-rose-700 dark:text-rose-300",
  "Getreide & Brot": "text-amber-700 dark:text-amber-300",
  "Protein": "text-orange-700 dark:text-orange-300",
  "Gewürze & Öle": "text-stone-600 dark:text-stone-300",
  "Sonstiges": "text-ink-muted",
};

const CATEGORIES: Record<string, RegExp> = {
  "Obst & Gemüse": /apfel|birne|banane|beere|tomate|gurke|salat|spinat|brokkoli|karotte|paprika|zwiebel|knoblauch|zucchini|avocado|zitrone|orange|mango|pilz|kürbis|kartoffel|süßkartoffel|kohl|blumenkohl|erbse|bohne|linse|mais/i,
  "Milchprodukte": /joghurt|milch|käse|quark|sahne|butter|mozzarella|parmesan|frischkäse|skyr|feta/i,
  "Getreide & Brot": /haferflocken|reis|nudel|pasta|brot|mehl|couscous|quinoa|bulgur|müsli|tortilla|wraps/i,
  "Protein": /hähnchen|huhn|pute|rind|lachs|thunfisch|garnelen|tofu|tempeh|eier|ei |fleisch|fisch|schinken/i,
  "Gewürze & Öle": /salz|pfeffer|zimt|kurkuma|oregano|basilikum|olivenöl|öl|essig|sojasoße|senf|honig|ahornsirup|vanille/i,
};

function categorize(items: string[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const uncategorized: string[] = [];

  for (const item of items) {
    let found = false;
    for (const [cat, pattern] of Object.entries(CATEGORIES)) {
      if (pattern.test(item)) {
        if (!result[cat]) result[cat] = [];
        result[cat].push(item);
        found = true;
        break;
      }
    }
    if (!found) uncategorized.push(item);
  }

  if (uncategorized.length > 0) {
    result["Sonstiges"] = uncategorized;
  }

  return result;
}

function useLocalStorageSet(key: string): [Set<string>, (item: string) => void] {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) setChecked(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, [key]);

  const toggle = useCallback((item: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      try {
        localStorage.setItem(key, JSON.stringify(Array.from(next)));
      } catch { /* ignore */ }
      return next;
    });
  }, [key]);

  return [checked, toggle];
}

export function ShoppingList({ items, interactive = false }: Props) {
  const [checked, toggle] = useLocalStorageSet("nutriva-shopping-checked");
  const [copied, setCopied] = useState(false);

  const categorized = categorize(items);
  const checkedCount = items.filter((i) => checked.has(i)).length;

  function handleCopy() {
    const text = Object.entries(categorized)
      .map(([cat, catItems]) => `${CATEGORY_LABELS[cat] || cat}:\n${catItems.map((i) => `  - ${i}`).join("\n")}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-xl border border-warm-border p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-warm-muted">
          {items.length} Zutaten
          {interactive && checkedCount > 0 && (
            <span className="text-primary ml-1">· {checkedCount} erledigt</span>
          )}
        </p>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary-light transition"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Kopiert!" : "Liste kopieren"}
        </button>
      </div>

      <div className="space-y-4">
        {Object.entries(categorized).map(([cat, catItems]) => (
          <div key={cat}>
            <h4
              className={`text-xs font-semibold mb-1.5 ${
                CATEGORY_ACCENT[cat] ?? "text-warm-dark"
              }`}
            >
              {CATEGORY_LABELS[cat] || cat}
            </h4>
            <div className="space-y-1">
              {catItems.map((item) => {
                const isChecked = checked.has(item);
                return interactive ? (
                  <label
                    key={item}
                    className="flex items-center gap-2.5 cursor-pointer group py-1 border-b border-border/40 last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(item)}
                      className="w-4 h-4 rounded border-warm-border text-primary focus:ring-primary/20 flex-shrink-0"
                    />
                    <span
                      className={`text-sm flex-1 transition ${
                        isChecked ? "text-warm-light line-through" : "text-warm-text"
                      }`}
                    >
                      {item}
                    </span>
                  </label>
                ) : (
                  <div
                    key={item}
                    className="flex items-center gap-2 py-1 border-b border-border/40 last:border-0"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    <span className="text-sm text-warm-text">{item}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
