/**
 * 配置：默认值 ← cordis.patch.yml 的 config ← 设置页写入的 config.json。
 * 磁盘配置优先级最高，设置页改完立刻生效，不会被 patch 覆盖。
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const DEFAULTS = {
  enabled: true,
  maxBytes: 60000,
  topicsMode: "index",
  projectMemory: true,
  includeIdentity: false,
  workbuddyRoot: "",
};

export function dshHome() {
  const env = process.env.DSH_HOME;
  if (env && env.trim()) return env.trim();
  return path.join(os.homedir(), ".dsh");
}

export function home(pkg = "dsh-wb-memory") {
  return path.join(dshHome(), pkg);
}

export function configPath() {
  return path.join(home(), "config.json");
}

export function loadConfig(patchConfig = {}) {
  let disk = {};
  try {
    disk = JSON.parse(fs.readFileSync(configPath(), "utf8")) || {};
  } catch {
    /* 首次运行 */
  }
  const merged = { ...DEFAULTS, ...(patchConfig || {}), ...disk };
  merged.maxBytes = Math.max(4000, Number(merged.maxBytes) || DEFAULTS.maxBytes);
  if (!["index", "full", "off"].includes(merged.topicsMode)) merged.topicsMode = "index";
  return merged;
}

export function saveConfig(patch) {
  const current = loadConfig({});
  const next = { ...current, ...(patch || {}) };
  let keep = {};
  for (const key of Object.keys(DEFAULTS)) {
    if (key in next) keep[key] = next[key];
  }
  fs.mkdirSync(home(), { recursive: true });
  const file = configPath();
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(keep, null, 2), "utf8");
  fs.renameSync(tmp, file);
  return keep;
}
