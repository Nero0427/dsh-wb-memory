/** 用假的 ModuleLoader 跑一遍浏览器半区，验证 factory 能执行、slot 能注册。 */
const registered = [];
const fakeReact = {
  createElement: (tag) => ({ tag }),
  useEffect: () => {},
  useState: () => [null, () => {}],
};

global.window = {
  location: { origin: "http://localhost:43120" },
  __ModuleLoader__: {
    load: ({ id, factory }) => {
      const mod = factory((n) => (n === "react" ? fakeReact : {}));
      console.log("[client] id =", id, "| exports =", Object.keys(mod).join(","));
      console.log("[client] name =", mod.name, "| inject =", mod.inject.join(","));
      mod.apply({
        slots: {
          inject: (slot, fn) => {
            console.log("[client] slots.inject", slot);
            fn();
          },
          register: (spec, comp) => {
            registered.push({ id: spec.id, order: spec.order, label: spec.label, comp: typeof comp });
            console.log("[client] register", JSON.stringify(spec));
            return {};
          },
        },
      });
    },
  },
};

await import("../src/client.js");
console.log("[client] registered =", registered.length);
if (registered.length !== 1) {
  console.error("FAIL: 未注册设置分区");
  process.exit(1);
}
console.log("OK");
