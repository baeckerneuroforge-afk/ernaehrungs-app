"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface Props {
  items: string[];
}

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

export function ShoppingList({ items }: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const categorized = categorize(items);

  function toggle(item: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  function handleCopy() {
    const text = Object.entries(categorized)
      .map(([cat, catItems]) => `${cat}:\n${catItems.map((i) => `  - ${i}`).join("\n")}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-xl border border-warm-border p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-warm-muted">{items.length} Zutaten</p>
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
            <h4 className="text-xs font-semibold text-warm-dark mb-1.5">{cat}</h4>
            <div className="space-y-1">
              {catItems.map((item) => (
                <label
                  key={item}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={checked.has(item)}
                    onChange={() => toggle(item)}
                    className="w-3.5 h-3.5 rounded border-warm-border text-primary focus:ring-primary/20"
                  />
                  <span
                    className={`text-sm transition ${
                      checked.has(item) ? "text-warm-light line-through" : "text-warm-text"
                    }`}
                  >
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
