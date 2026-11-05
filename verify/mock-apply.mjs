/**
 * 假 ctx 跑宿主半区，重点验证 system-prompt/assemble 的注入位置：
 * 记忆段必须出现，且排在 dsh-purge 的尾部锚点之前。
 */
import { apply, name, inject } from "../src/lib/index.js";

const handlers = {};
const routes = [];
const commands = [];

const ctx = {
  logger: { info: (m) => console.log("[log]", m), warn: (m) => console.log("[warn]", m) },
  effect: (fn) => {
    const d = fn();
    return typeof d === "function" ? d : () => {};
  },
  on: (event, fn) => {
    handlers[event] = fn;
    console.log("[on]", event);
    return () => {};
  },
  get: (k) =>
    k === "commands"
      ? {
          register: (spec) => {
            commands.push(spec.name);
            console.log("[cmd]", spec.name);
          },
        }
      : undefined,
  webServer: {
    register: (spec) => {
      routes.push(spec.path);
      console.log("[route]", spec.kind, spec.path);
      return () => {};
    },
  },
};

console.log("name =", name, "| inject =", inject.join(","));
apply(ctx, {});

const before = {
  sections: [
    { name: "dsh-purge", text: "PURGE BODY" },
    { name: "dsh-purge:anchor", text: "ANCHOR" },
  ],
  contexts: [],
  tools: [],
  variables: {},
};

const handler = handlers["system-prompt/assemble"];
if (!handler) {
  console.error("FAIL: 未挂 system-prompt/assemble");
  process.exit(1);
}

const out = await handler(before, {}, async () => before);
const names = out.sections.map((s) => s.name);
console.log("sections =", names.join(" -> "));
console.log("bytes =", Buffer.byteLength(out.sections.find((s) => s.name === "dsh-wb-memory")?.text || "", "utf8"));

const mine = names.indexOf("dsh-wb-memory");
const anchor = names.indexOf("dsh-purge:anchor");
const purge = names.indexOf("dsh-purge");
if (mine < 0) {
  console.error("FAIL: 记忆段没注入");
  process.exit(1);
}
if (!(purge === 0 && mine === 1 && anchor === 2)) {
  console.error("FAIL: 顺序不对，期望 purge -> memory -> anchor");
  process.exit(1);
}

// 重复调用不能叠加
const out2 = await handler(out, {}, async () => out);
console.log("重复注入后段数 =", out2.sections.length);
if (out2.sections.length !== out.sections.length) {
  console.error("FAIL: 重复注入");
  process.exit(1);
}

console.log("routes =", routes.join(","), "| commands =", commands.join(","));
console.log("OK");
