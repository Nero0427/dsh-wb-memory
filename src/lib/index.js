/**
 * dsh-wb-memory — 宿主半区。
 *
 * 只做一件事：把 WorkBuddy 的记忆文件直接注入 DSH 的 system prompt。
 *
 * 不落任何 DSH 侧副本（不写 AGENTS.md、不装 dsh-agent-instructions），
 * 保证 DSH 与 WorkBuddy 读到的永远是同一份 Markdown。
 *
 * 与 dsh-purge 的关系：它先挂 system-prompt/assemble 并把自己的段提到最前，
 * 我们随后 append 一个独立 section，不改它的任何内容。宿主补丁保证
 * `dsh-purge*` 段永远排在第一位，所以记忆段天然在它后面。
 */
import fs from "node:fs";

import { loadConfig, saveConfig, home } from "./config.js";
import { detectWorkbuddyRoot, readSources, renderInjectText, sourceStamp } from "./render.js";

export const name = "dsh-wb-memory";

export const inject = ["systemPrompt", "webServer"];

const ROUTE_PREFIX = "/dsh-wb-memory";
const SECTION_NAME = "dsh-wb-memory";

const state = {
  cache: null, // { stamp, result }
  lastInject: null, // { at, bytes, truncated }
  injectCount: 0,
  dropped: 0,
  lastError: "",
};

function log(ctx, msg) {
  try {
    if (ctx?.logger?.info) ctx.logger.info(`[dsh-wb-memory] ${msg}`);
    else console.info(`[dsh-wb-memory] ${msg}`);
  } catch {
    /* 日志失败不影响主流程 */
  }
}

function resolveRoot(cfg) {
  const explicit = (cfg.workbuddyRoot || "").trim();
  if (explicit) {
    try {
      if (fs.statSync(explicit).isDirectory()) return explicit;
    } catch {
      /* 配错就退回自动探测 */
    }
  }
  return detectWorkbuddyRoot();
}

/** 按 mtime 缓存渲染结果；源没变就不重复读盘。 */
function getInject(cfg, force = false) {
  const root = resolveRoot(cfg);
  if (!root) {
    state.lastError = "找不到 WorkBuddy 记忆目录";
    return null;
  }
  const stamp = sourceStamp(root);
  if (!force && state.cache && state.cache.stamp === stamp && state.cache.root === root && state.cache.cfgKey === cfgKey(cfg)) {
    return state.cache.result;
  }
  try {
    const result = renderInjectText(readSources(root), cfg);
    state.cache = { stamp, root, cfgKey: cfgKey(cfg), result };
    state.lastError = "";
    return result;
  } catch (error) {
    state.lastError = String(error?.message || error);
    log(null, `渲染失败: ${state.lastError}`);
    return null;
  }
}

function cfgKey(cfg) {
  return [cfg.maxBytes, cfg.topicsMode, cfg.projectMemory, cfg.includeIdentity, cfg.workbuddyRoot].join("|");
}

function installAssembly(ctx, patchCfg) {
  ctx.on("system-prompt/assemble", async (...args) => {
    const [assembly] = args;
    const next = typeof args[args.length - 1] === "function" ? args[args.length - 1] : null;

    let out = assembly;
    if (next) {
      try {
        out = await next();
      } catch {
        out = assembly; // 下游炸了就退回原始装配，别把整轮搞挂
      }
    }

    try {
      const cfg = loadConfig(patchCfg);
      if (cfg.enabled === false) return out;
      if (!out || typeof out !== "object" || !Array.isArray(out.sections)) return out;
      if (out.sections.some((s) => s && s.name === SECTION_NAME)) return out;

      const rendered = getInject(cfg);
      if (!rendered || !rendered.text) {
        state.dropped += 1;
        return out;
      }

      const node = { name: SECTION_NAME, text: rendered.text };
      const sections = out.sections.slice();
      // 插在 purge 的尾部锚点之前，保住它的锚点仍在最后
      const anchorIdx = sections.findIndex((s) => /^dsh-purge.*anchor/i.test(String(s?.name || "")));
      if (anchorIdx >= 0) sections.splice(anchorIdx, 0, node);
      else sections.push(node);

      state.injectCount += 1;
      state.lastInject = { at: Date.now(), bytes: rendered.bytes, truncated: rendered.truncated };
      return { ...out, sections };
    } catch (error) {
      state.lastError = String(error?.message || error);
      try {
        console.warn("[dsh-wb-memory] assemble 注入失败:", state.lastError);
      } catch {
        /* ignore */
      }
      return out;
    }
  });
}

function snapshot(cfg) {
  const root = resolveRoot(cfg);
  const cached = state.cache;
  return {
    ok: true,
    mode: "inject",
    config: { ...cfg, workbuddyRoot: cfg.workbuddyRoot || root || "" },
    resolvedRoot: root,
    cache: cached
      ? {
          bytes: cached.result?.bytes || 0,
          maxBytes: cached.result?.maxBytes || 0,
          truncated: !!cached.result?.truncated,
          topics: cached.result?.topics || 0,
          missing: cached.result?.missing || [],
          breakdown: cached.result?.breakdown || {},
          // 粗估：中文 3 字节≈1 字，DeepSeek 约 1 token / 1.4 字
          tokensEst: Math.round((cached.result?.bytes || 0) / 4.2),
        }
      : null,
    injected: state.injectCount,
    dropped: state.dropped,
    lastInject: state.lastInject,
    lastError: state.lastError,
  };
}

function sendJson(res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) raw = raw.slice(0, 1e6);
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function installRoutes(ctx, patchCfg) {
  ctx.effect(() =>
    ctx.webServer.register({
      kind: "prefix",
      path: ROUTE_PREFIX,
      handler: async (req, res) => {
        const url = new URL(req.url || "/", "http://localhost");
        const route = url.pathname.slice(ROUTE_PREFIX.length) || "/";
        const method = (req.method || "GET").toUpperCase();
        const cfg = loadConfig(patchCfg);

        try {
          if (route === "/status" && method === "GET") return sendJson(res, 200, snapshot(cfg));

          if (route === "/preview" && method === "GET") {
            const result = getInject(cfg, true);
            if (!result) return sendJson(res, 404, { ok: false, error: state.lastError || "找不到记忆目录" });
            return sendJson(res, 200, {
              ok: true,
              text: result.text,
              bytes: result.bytes,
              maxBytes: result.maxBytes,
              truncated: result.truncated,
            });
          }

          if (route === "/detect" && method === "GET") {
            return sendJson(res, 200, { ok: true, root: detectWorkbuddyRoot() });
          }

          if (route === "/render" && method === "POST") {
            const result = getInject(cfg, true);
            return sendJson(res, 200, {
              ok: !!result,
              result: result ? { bytes: result.bytes, maxBytes: result.maxBytes, truncated: result.truncated, topics: result.topics } : { error: state.lastError },
            });
          }

          if (route === "/config" && method === "POST") {
            const body = await readBody(req);
            saveConfig(body);
            const fresh = loadConfig(patchCfg);
            getInject(fresh, true);
            return sendJson(res, 200, { ok: true, config: fresh });
          }

          return sendJson(res, 404, { ok: false, error: `unknown route ${method} ${route}` });
        } catch (error) {
          return sendJson(res, 500, { ok: false, error: String(error?.message || error) });
        }
      },
    }),
  );
}

function installCommand(ctx, patchCfg) {
  const commands = ctx.get?.("commands");
  if (!commands || typeof commands.register !== "function") return;
  try {
    commands.register({
      name: "memory",
      description: "WorkBuddy 记忆注入：status | render | preview | path",
      input: { hint: "status | render | preview | path" },
      handler: async (invocation) => {
        const args = String(invocation?.rawInput || "").trim().split(/\s+/).filter(Boolean);
        const sub = (args[0] || "status").toLowerCase();
        const cfg = loadConfig(patchCfg);
        const snap = snapshot(cfg);

        if (sub === "render") {
          const r = getInject(cfg, true);
          if (!r) return { kind: "error", text: `渲染失败：${state.lastError}` };
          return {
            kind: "success",
            text: [
              `已重算 ${r.bytes} 字节${r.truncated ? "（超预算已截断）" : ""}`,
              `源：${snap.resolvedRoot}`,
              "下一轮请求起生效（system prompt 每轮重装配）。",
            ].join("\n"),
          };
        }
        if (sub === "preview") {
          const r = getInject(cfg, true);
          if (!r) return { kind: "error", text: state.lastError || "找不到记忆目录" };
          return { kind: "success", text: `${r.bytes}/${r.maxBytes} 字节\n\n${r.text.slice(0, 4000)}` };
        }
        if (sub === "path") {
          return {
            kind: "success",
            text: [`源目录：${snap.resolvedRoot || "未找到"}`, `注入段名：${SECTION_NAME}`, "不落文件，直接进 system prompt。"].join("\n"),
          };
        }

        const c = snap.cache;
        return {
          kind: "success",
          text: [
            `状态：${cfg.enabled === false ? "已关闭" : "注入中"}`,
            `源：${snap.resolvedRoot || "未找到"}`,
            `正文：${c ? `${c.bytes}/${c.maxBytes} 字节 · ${c.topics} 个主题${c.truncated ? " · 已截断" : ""}` : "尚未渲染"}`,
            `已注入 ${snap.injected} 轮 · 空渲染丢弃 ${snap.dropped} 次`,
            `最近注入：${snap.lastInject?.at ? new Date(snap.lastInject.at).toLocaleString() : "尚未"}`,
            snap.lastError ? `错误：${snap.lastError}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        };
      },
    });
  } catch (error) {
    log(ctx, `命令注册失败: ${error?.message || error}`);
  }
}

export function apply(ctx, patchConfig = {}) {
  const cfg = loadConfig(patchConfig);
  getInject(cfg, true);
  installAssembly(ctx, patchConfig);
  installRoutes(ctx, patchConfig);
  installCommand(ctx, patchConfig);
  log(ctx, `ready · 源 ${resolveRoot(cfg) || "(未找到)"} · ${state.cache?.result?.bytes || 0}B`);
}
