/**
 * Unit/static checks against SHIPPED modules — no paid APIs.
 * Run: npx tsx scripts/unit-bugfix-checks.mts
 */
import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  calendarDateInTimeZone,
  calendarDaysBetween,
  todayLocal,
} from "../lib/local-date";
import { classifyAction } from "../lib/classify-action";
import {
  createChatSaveToken,
  verifyChatSaveToken,
} from "../lib/chat-save-token";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

let failed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL  ${name}: ${(e as Error).message}`);
  }
}

// --- Pure helpers (shipped) ---

check("todayLocal returns YYYY-MM-DD", () => {
  assert.match(todayLocal(), /^\d{4}-\d{2}-\d{2}$/);
});

check("calendarDateInTimeZone Berlin summer midnight skew", () => {
  // 22:30 UTC = 00:30 CEST next day
  assert.equal(
    calendarDateInTimeZone(new Date("2026-06-15T22:30:00.000Z"), "Europe/Berlin"),
    "2026-06-16"
  );
  assert.equal(
    calendarDateInTimeZone(new Date("2026-06-15T12:00:00.000Z"), "Europe/Berlin"),
    "2026-06-15"
  );
});

check("calendarDaysBetween DST-stable", () => {
  assert.equal(calendarDaysBetween("2026-03-28", "2026-03-30"), 2);
  assert.equal(calendarDaysBetween("2026-06-01", "2026-06-08"), 7);
});

check("classifyAction: casual plan/progress is chat", () => {
  assert.equal(classifyAction("Was ist ein Ernährungsplan?"), "chat");
  assert.equal(classifyAction("mein Fortschritt diese Woche"), "chat");
});

check("classifyAction: explicit generate/review", () => {
  assert.equal(
    classifyAction("Erstelle mir einen Ernährungsplan"),
    "plan_generation"
  );
  assert.equal(classifyAction("Wochenreview bitte"), "review");
  assert.equal(classifyAction("Wie war meine Woche?"), "review");
});

check("chat save token binds to exact assistant payload", () => {
  process.env.CHAT_SAVE_SECRET = "unit-test-secret";
  const t = createChatSaveToken("u1", "s1", "hello", "world");
  assert.equal(verifyChatSaveToken("u1", "s1", "hello", "world", t), true);
  assert.equal(verifyChatSaveToken("u1", "s1", "hello", "FORGED", t), false);
  assert.equal(verifyChatSaveToken("u2", "s1", "hello", "world", t), false);
});

// --- Structural (shipped sources) ---

check("middleware public legal/support routes", () => {
  const m = fs.readFileSync(path.join(root, "middleware.ts"), "utf8");
  for (const s of ["/agb", "/support", "/hilfe", "/api/support"]) {
    assert.ok(m.includes(s), `missing ${s}`);
  }
});

check("stripe webhook fails closed on non-duplicate dedupe errors", () => {
  const m = fs.readFileSync(
    path.join(root, "app/api/webhooks/stripe/route.ts"),
    "utf8"
  );
  assert.ok(m.includes('dedupeErr.code === "23505"'));
  assert.ok(m.includes("status: 500"));
});

check("user delete cancels stripe + surfaces purge errors", () => {
  const m = fs.readFileSync(
    path.join(root, "app/api/user/delete/route.ts"),
    "utf8"
  );
  assert.ok(m.includes("cancelStripeSubscriptionForUser"));
  assert.ok(m.includes("purge_incomplete"));
});

check("chat save requires HMAC save_token", () => {
  const m = fs.readFileSync(
    path.join(root, "app/api/chat/save/route.ts"),
    "utf8"
  );
  assert.ok(m.includes("verifyChatSaveToken"));
  assert.ok(m.includes("save_token"));
});

check("getUserPlan gates on subscription_status", () => {
  const m = fs.readFileSync(
    path.join(root, "lib/feature-gates-server.ts"),
    "utf8"
  );
  assert.ok(m.includes("subscription_status"));
  assert.ok(m.includes("past_due") || m.includes('status === "active"'));
});

check("monthly-report selects real ea_ziele columns", () => {
  const m = fs.readFileSync(path.join(root, "lib/monthly-report.ts"), "utf8");
  assert.ok(m.includes("beschreibung"));
  assert.ok(m.includes("zieldatum"));
  assert.ok(!m.includes('select("id, titel, ziel_typ'));
});

check("refundCredits avoids double-credit on partial RPC success", () => {
  const m = fs.readFileSync(path.join(root, "lib/credits.ts"), "utf8");
  assert.ok(m.includes("needFallbackSub"));
  assert.ok(m.includes("needFallbackTopup"));
});

check("account-merge frees stripe IDs before new insert", () => {
  const m = fs.readFileSync(path.join(root, "app/api/profile/route.ts"), "utf8");
  const freeIdx = m.indexOf("failed to free stripe IDs on old row");
  const insertIdx = m.indexOf("const insertPayload");
  assert.ok(freeIdx > 0 && insertIdx > freeIdx, "free stripe before insertPayload");
  assert.ok(m.includes("stripe_customer_id: null"));
});

check("/api/credits uses getUserPlan (status-gated)", () => {
  const m = fs.readFileSync(path.join(root, "app/api/credits/route.ts"), "utf8");
  assert.ok(m.includes("getUserPlan"));
  assert.ok(!m.includes('select("subscription_plan")'));
});

check("calorie_target gate uses getUserPlan", () => {
  const m = fs.readFileSync(path.join(root, "app/api/profile/route.ts"), "utf8");
  assert.ok(m.includes("getUserPlan"));
  // Must not gate calorie_target on raw subscription_plan only
  assert.ok(
    !m.includes('.select("subscription_plan")\n        .eq("clerk_id", userId)')
  );
});

if (failed > 0) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll shipped-module checks passed.");
