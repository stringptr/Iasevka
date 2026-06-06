import * as FS from "node:fs";
import * as Path from "node:path";
import { tmpdir } from "node:os";
import * as toml from "@iarna/toml";
import { mkdtempSync } from "node:fs";
import which from "which";
import { spawnSync } from "node:child_process";

const BUILD_PLANS = "build-plans.toml";
const PRIVATE_BUILD_PLANS = "private-build-plans.toml";
const DIST = "dist";

function parsePlans() {
  const bp = JSON.parse(JSON.stringify(toml.parse(FS.readFileSync(BUILD_PLANS, "utf-8"))));
  bp.buildPlans = bp.buildPlans || {};
  if (FS.existsSync(PRIVATE_BUILD_PLANS)) {
    const privateBP = JSON.parse(JSON.stringify(toml.parse(FS.readFileSync(PRIVATE_BUILD_PLANS, "utf-8"))));
    Object.assign(bp.buildPlans, privateBP.buildPlans || {});
  }
  return bp;
}

function findPatcher() {
  try {
    return which.sync("font-patcher");
  } catch {
    return null;
  }
}

function patchFont(patcherPath, fontPath, options) {
  const dir = Path.dirname(fontPath);
  const baseName = Path.basename(fontPath);
  const tmpDir = mkdtempSync(Path.join(tmpdir(), "nerd-"));
  const tmpFontPath = Path.join(tmpDir, baseName);

  try {
    FS.copyFileSync(fontPath, tmpFontPath);

    const args = ["--no-name"];
    if (options.complete) args.push("--complete");
    if (options.mono) args.push("--mono");
    args.push("-out", tmpDir, tmpFontPath);

    const result = spawnSync(patcherPath, args, { stdio: "inherit" });
    if (result.error || result.status !== 0) {
      throw new Error(`font-patcher failed: ${result.error?.message || `exit code ${result.status}`}`);
    }

    const files = FS.readdirSync(tmpDir);
    const patchedFiles = files.filter(f => f.endsWith(".ttf") && f !== baseName);
    if (patchedFiles.length === 0) {
      throw new Error(`No patched font file found in ${tmpDir}`);
    }

    FS.copyFileSync(Path.join(tmpDir, patchedFiles[0]), fontPath);
    console.log(`  Patched: ${fontPath}`);
  } finally {
    FS.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function getSuffixes(weights, slopes, widths) {
  const WIDTH_NORMAL = "Normal";
  const WEIGHT_NORMAL = "Regular";
  const SLOPE_NORMAL = "Upright";
  const DEFAULT_SUBFAMILY = "Regular";

  const mapping = {};
  for (const w in weights) {
    for (const s in slopes) {
      for (const wd in widths) {
        const suffix =
          (wd === WIDTH_NORMAL ? "" : wd) +
          (w === WEIGHT_NORMAL ? "" : w) +
          (s === SLOPE_NORMAL ? "" : s) || DEFAULT_SUBFAMILY;
        mapping[suffix] = true;
      }
    }
  }
  return Object.keys(mapping);
}

function getUnhintedDir(prefix) {
  return Path.join(DIST, prefix, "TTF-Unhinted");
}
function getHintedDir(prefix) {
  return Path.join(DIST, prefix, "TTF");
}

function main() {
  const patcher = findPatcher();
  if (!patcher) {
    console.error("font-patcher not found. Install: pip3 install nerd-fonts-patcher");
    process.exit(1);
  }

  const rp = parsePlans();
  const plans = rp.buildPlans || {};

  for (const [prefix, plan] of Object.entries(plans)) {
    const nf = plan.nerdFont;
    if (!nf || !nf.enable) continue;

    console.log(`Nerd-font patching: ${prefix} (${plan.family})`);

    const weights = plan.weights || rp.weights;
    const slopes = plan.slopes || rp.slopes;
    const widths = plan.widths || rp.widths;

    if (!weights || !slopes || !widths) {
      console.warn(`  Skipping ${prefix}: incomplete weight/slope/width definitions`);
      continue;
    }

    const suffixes = getSuffixes(weights, slopes, widths);
    const options = { complete: nf.complete !== false, mono: nf.mono !== false };

    for (const suffix of suffixes) {
      const fileName = `${prefix}-${suffix}.ttf`;

      const hintedPath = Path.join(getHintedDir(prefix), fileName);
      if (FS.existsSync(hintedPath)) {
        patchFont(patcher, hintedPath, options);
      }

      const unhintedPath = Path.join(getUnhintedDir(prefix), fileName);
      if (FS.existsSync(unhintedPath)) {
        patchFont(patcher, unhintedPath, options);
      }
    }
  }
}

main();
