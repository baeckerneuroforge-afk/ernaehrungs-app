// Wrapper: real checks live in unit-bugfix-checks.mts (imports shipped TS).
import { spawnSync } from "child_process";
const r = spawnSync("npx", ["tsx", "scripts/unit-bugfix-checks.mts"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(r.status ?? 1);
