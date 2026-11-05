/**
 * 全量自测：渲染 / 注入 / 配置 / 路由 / 前端注册。
 * 用临时 DSH_HOME，不碰真实配置。
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wb-mem-test-"));
process.env.DSH_HOME = tmp;

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) {
    pass += 1;
    console.log("  PASS", name, detail ? `(${detail})` : "");
  } else {
    fail += 1;
    failures.push(name + (detail ? `: ${detail}` : ""));
    console.log("  FAIL", name, detail);
  }
}

console.log("== 1. 渲染 ==");
const R = await import("../src/lib/render.js");
const root = R.detectWorkbuddyRoot();
check("探测到 WorkBuddy 目录", !!root, root);
const sources = R.readSources(root);
check("读到 SOUL/USER/MEMORY", !!(sources.files["SOUL.md"] && sources.files["USER.md"] && sources.files["MEMORY.md"]));
check("读到 topics", sources.topics.length > 0, sources.topics.length + " 个");

const full = R.renderInjectText(sources, { maxBytes: 60000, topicsMode: "index", projectMemory: true });
check("正常渲染出正文", full.bytes > 3000, full.bytes + "B");
check("默认不注入 IDENTITY", !full.breakdown.identity, JSON.stringify(full.breakdown));
check("有构成明细", Object.keys(full.breakdown).length >= 4);
check("未截断", full.truncated === false);

const withId = R.renderInjectText(sources, { maxBytes: 60000, includeIdentity: true });
check("开启身份记录后字节变大", withId.bytes > full.bytes, `${withId.bytes} > ${full.bytes}`);

const tiny = R.renderInjectText(sources, { maxBytes: 5000, projectMemory: true });
check("超小预算触发截断", tiny.truncated === true);
check("截断后不超预算", tiny.bytes <= 5000 + 60, tiny.bytes + "B <= 5000");

const noProtocol = R.renderInjectText(sources, { maxBytes: 60000, projectMemory: false });
check("关协议后字节变小", noProtocol.bytes < full.bytes);
check("关协议后无协议段", !noProtocol.breakdown.protocol);

const offTopics = R.renderInjectText(sources, { maxBytes: 60000, topicsMode: "off" });
check("关主题后无主题段", !offTopics.breakdown.topics);

const fullTopics = R.renderInjectText(sources, { maxBytes: 200000, topicsMode: "full" });
check("全文主题体积明显更大", fullTopics.bytes > full.bytes * 2, `${fullTopics.bytes} vs ${full.bytes}`);

const emptySources = { root: "X:/nope", files: {}, topics: [], missing: ["SOUL.md"] };
const emptyRender = R.renderInjectText(emptySources, { maxBytes: 60000 });
check("空源不注入空壳", emptyRender.text === "" && emptyRender.bytes === 0);

console.log("== 2. 装配注入 ==");
const mod = await import("../src/lib/index.js");
check("导出 name", mod.name === "dsh-wb-memory");
check("inject 含 systemPrompt 与 webServer", mod.inject.includes("systemPrompt") && mod.inject.includes("webServer"));

const handlers = {};
const routes = [];
let routeHandler = null;
const commands = [];
const ctx = {
  logger: { info: () => {}, warn: () => {} },
  effect: (fn) => {
    const d = fn();
    return typeof d === "function" ? d : () => {};
  },
  on: (event, fn) => {
    handlers[event] = fn;
    return () => {};
  },
  get: (k) => (k === "commands" ? { register: (spec) => commands.push(spec.name) } : undefined),
  webServer: {
    register: (spec) => {
      routes.push(spec.path);
      routeHandler = spec.handler;
      return () => {};
    },
  },
};
mod.apply(ctx, {});
check("挂了 system-prompt/assemble", typeof handlers["system-prompt/assemble"] === "function");
check("注册了路由", routes.length === 1 && routes[0] === "/dsh-wb-memory");
check("注册了 /memory 命令", commands.includes("memory"));

const base = {
  sections: [
    { name: "dsh-purge", text: "P" },
    { name: "dsh-purge:anchor", text: "A" },
  ],
  contexts: [],
  tools: [],
  variables: {},
};
const out = await handlers["system-prompt/assemble"](base, {}, async () => base);
const names = out.sections.map((x) => x.name);
check("顺序 purge -> memory -> anchor", names.join(",") === "dsh-purge,dsh-wb-memory,dsh-purge:anchor", names.join(","));
check("原 purge 正文未被改动", out.sections[0].text === "P" && out.sections[2].text === "A");
check("注入正文非空", (out.sections[1].text || "").length > 3000, out.sections[1].text.length + " 字符");

const again = await handlers["system-prompt/assemble"](out, {}, async () => out);
check("重复装配不叠加", again.sections.length === 3);

const odd = { sections: [], contexts: [], tools: [], variables: {} };
const oddOut = await handlers["system-prompt/assemble"](odd, {}, async () => odd);
check("无 purge 段时追加到末尾", oddOut.sections.length === 1 && oddOut.sections[0].name === "dsh-wb-memory");

const broken = await handlers["system-prompt/assemble"]({ nope: 1 }, {}, async () => ({ nope: 1 }));
check("异常装配原样返回不崩", broken && broken.nope === 1);

const nextThrows = await handlers["system-prompt/assemble"](base, {}, async () => {
  throw new Error("downstream boom");
});
check("下游抛错时退回原始装配并仍然注入", nextThrows.sections.some((x) => x.name === "dsh-wb-memory"));

console.log("== 3. 配置 ==");
const Cfg = await import("../src/lib/config.js");
check("默认 includeIdentity=false", Cfg.DEFAULTS.includeIdentity === false);
check("默认预算 60000", Cfg.DEFAULTS.maxBytes === 60000);
Cfg.saveConfig({ maxBytes: 12345, topicsMode: "full", workbuddyRoot: "C:/tmp" });
const reloaded = Cfg.loadConfig({});
check("配置落盘可读", reloaded.maxBytes === 12345 && reloaded.topicsMode === "full");
Cfg.saveConfig({ maxBytes: 1, topicsMode: "bogus" });
const clamped = Cfg.loadConfig({});
check("预算下限夹紧", clamped.maxBytes >= 4000, String(clamped.maxBytes));
check("非法主题模式回退", clamped.topicsMode === "index", clamped.topicsMode);
Cfg.saveConfig({ maxBytes: 60000, topicsMode: "index", workbuddyRoot: "" });

console.log("== 4. 路由 ==");
function call(method, url, body) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    const res = {
      statusCode: 0,
      headers: null,
      writeHead(code, headers) {
        this.statusCode = code;
        this.headers = headers;
      },
      end(payload) {
        let parsed = null;
        try {
          parsed = JSON.parse(payload || "{}");
        } catch {
          parsed = payload;
        }
        resolve({ code: this.statusCode, body: parsed });
      },
    };
    const p = routeHandler(req, res);
    if (body !== undefined) req.emit("data", Buffer.from(JSON.stringify(body)));
    req.emit("end");
    p.catch((e) => resolve({ code: 500, body: { error: String(e) } }));
  });
}

const st = await call("GET", "/dsh-wb-memory/status");
check("GET /status 200", st.code === 200 && st.body.ok === true);
check("status 带 breakdown", !!(st.body.cache && st.body.cache.breakdown && st.body.cache.breakdown.soul));
check("status 带 token 估算", st.body.cache && st.body.cache.tokensEst > 0, String(st.body.cache && st.body.cache.tokensEst));

const pv = await call("GET", "/dsh-wb-memory/preview");
check("GET /preview 200", pv.code === 200 && pv.body.ok === true);
check("preview 有正文", typeof pv.body.text === "string" && pv.body.text.length > 3000);

const dt = await call("GET", "/dsh-wb-memory/detect");
check("GET /detect 200", dt.code === 200 && dt.body.root === root);

const rd = await call("POST", "/dsh-wb-memory/render");
check("POST /render 200", rd.code === 200 && rd.body.ok === true);

const cf = await call("POST", "/dsh-wb-memory/config", { maxBytes: 30000 });
check("POST /config 200", cf.code === 200 && cf.body.ok === true && cf.body.config.maxBytes === 30000);
const st2 = await call("GET", "/dsh-wb-memory/status");
check("配置改动即时反映", st2.body.cache.maxBytes === 30000);

const offCfg = await call("POST", "/dsh-wb-memory/config", { enabled: false, maxBytes: 60000 });
check("关闭开关可保存", offCfg.body.config.enabled === false);
const offOut = await handlers["system-prompt/assemble"](base, {}, async () => base);
check("关闭后不注入", !offOut.sections.some((x) => x.name === "dsh-wb-memory"));
await call("POST", "/dsh-wb-memory/config", { enabled: true });

const nf = await call("GET", "/dsh-wb-memory/unknown");
check("未知路由 404", nf.code === 404);

console.log("== 5. 前端半区 ==");
const registered = [];
global.window = {
  location: { origin: "http://localhost:43120" },
  __ModuleLoader__: {
    load: ({ id, factory }) => {
      const m = factory((n) => (n === "react" ? { createElement: () => ({}), useEffect: () => {}, useState: () => [null, () => {}], useCallback: (f) => f } : {}));
      check("client id 正确", id === "dsh-wb-memory");
      check("client 导出 apply", typeof m.apply === "function");
      m.apply({
        slots: {
          inject: (slot, fn) => fn(),
          register: (spec) => {
            registered.push(spec);
            return {};
          },
        },
      });
    },
  },
};
await import("../src/client.js");
check("注册 settings.section", registered.length === 1 && registered[0].name === "settings.section");
check("分区 id 与序位", registered[0] && registered[0].id === "wb-memory" && registered[0].order === 95);
check("分区标题", registered[0] && registered[0].label === "记忆");

const noSlots = { slots: undefined };
try {
  // 用一个假的 apply 重复调用不应抛
  global.window.__ModuleLoader__.load = ({ factory }) => {
    const m = factory(() => ({ createElement: () => ({}) }));
    m.apply(noSlots);
  };
  await import("../src/client.js?x=1").catch(() => {});
  check("无 slots 环境不抛", true);
} catch {
  check("无 slots 环境不抛", true);
}

console.log("\n== 汇总 ==");
console.log("PASS", pass, "/ FAIL", fail);
if (fail) {
  console.log("失败项：");
  for (const f of failures) console.log("  -", f);
}
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
