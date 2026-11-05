/**
 * dsh-wb-memory — 浏览器半区。
 *
 * 设置对话框左侧的「记忆」分区：配置记忆源、预算与注入方式，
 * 查看注入构成与将要注入 system prompt 的正文。
 * 无构建步骤：DSH 用 web loader 直接把本文件当懒加载 CJS 工厂跑。
 */
window.__ModuleLoader__.load({
  id: "dsh-wb-memory",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    const react = require("react");
    const h = react.createElement;
    const { useEffect, useState, useCallback } = react;

    const name = "dsh-wb-memory";
    const inject = ["slots"];

    const C = {
      text: "var(--dsw-alias-label-primary, #ececec)",
      sub: "var(--dsw-alias-label-secondary, rgba(170,175,182,0.92))",
      dim: "var(--dsw-alias-label-tertiary, rgba(150,155,162,0.72))",
      faint: "rgba(150,155,162,0.45)",
      card: "rgba(255,255,255,0.022)",
      inner: "rgba(0,0,0,0.20)",
      border: "var(--dsw-alias-border-secondary, rgba(255,255,255,0.085))",
      borderSoft: "var(--dsw-alias-border-tertiary, rgba(255,255,255,0.055))",
      green: "#3ecf8e",
      amber: "#d9a441",
      red: "#e5605f",
    };
    const FONT = "var(--dsw-alias-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif)";
    const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Courier New', monospace";

    const SEGMENTS = [
      { key: "soul", label: "身份准则", color: "#7f77dd" },
      { key: "user", label: "用户画像", color: "#4f9de0" },
      { key: "memory", label: "长期记忆", color: "#2fa886" },
      { key: "topics", label: "主题索引", color: "#9a978d" },
      { key: "protocol", label: "记忆协议", color: "#c08a3e" },
      { key: "identity", label: "身份记录", color: "#b06a9e" },
    ];

    function api(p, init) {
      const url = new URL("/dsh-wb-memory" + p, window.location.origin).toString();
      return fetch(url, Object.assign({ credentials: "same-origin" }, init || {}))
        .then((r) => r.json())
        .catch((e) => ({ ok: false, error: String(e && e.message ? e.message : e) }));
    }

    function fmtBytes(n) {
      if (!n && n !== 0) return "—";
      if (n < 1024) return n + " B";
      if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
      return (n / 1048576).toFixed(2) + " MB";
    }
    function fmtTime(ms) {
      if (!ms) return "—";
      const d = new Date(ms);
      const p = (x) => String(x).padStart(2, "0");
      return p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
    }

    const s = {
      panel: { padding: "2px 2px 28px", fontFamily: FONT, color: C.text },
      title: { fontSize: "15px", fontWeight: "600", letterSpacing: "-0.01em" },
      intro: { fontSize: "12px", lineHeight: "19px", color: C.dim, marginTop: "6px", maxWidth: "560px" },
      card: {
        marginTop: "16px",
        borderRadius: "12px",
        background: C.card,
        border: "1px solid " + C.borderSoft,
        overflow: "hidden",
      },
      cardHead: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        padding: "11px 14px 9px",
        borderBottom: "1px solid " + C.borderSoft,
      },
      cardTitle: { fontSize: "12.5px", fontWeight: "500", color: C.text, letterSpacing: "0.01em" },
      cardBody: { padding: "13px 14px 14px" },
      stats: { display: "flex", gap: "8px", flexWrap: "wrap" },
      stat: {
        flex: "1 1 96px",
        minWidth: "96px",
        padding: "9px 11px",
        borderRadius: "9px",
        background: C.inner,
        border: "1px solid " + C.borderSoft,
      },
      statLabel: { fontSize: "10.5px", color: C.faint, letterSpacing: "0.03em" },
      statValue: {
        marginTop: "3px",
        fontSize: "15px",
        fontWeight: "500",
        color: C.text,
        fontVariantNumeric: "tabular-nums",
        lineHeight: "20px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      },
      bar: {
        display: "flex",
        height: "6px",
        borderRadius: "999px",
        overflow: "hidden",
        background: "rgba(255,255,255,0.05)",
        marginTop: "14px",
      },
      legend: {
        display: "flex",
        flexWrap: "wrap",
        gap: "4px 14px",
        marginTop: "10px",
      },
      legendItem: { display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: C.dim },
      dot: (color) => ({ width: "7px", height: "7px", borderRadius: "2px", background: color, flex: "0 0 auto" }),
      row: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "14px",
        padding: "9px 0",
        borderTop: "1px solid " + C.borderSoft,
      },
      rowFirst: { borderTop: "none", paddingTop: "0" },
      rowTitle: { fontSize: "12.5px", color: C.text },
      rowDesc: { fontSize: "11.5px", color: C.faint, marginTop: "2px", lineHeight: "16px" },
      fieldLabel: { fontSize: "11.5px", color: C.dim, marginBottom: "6px", display: "block" },
      input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "7px 10px",
        borderRadius: "8px",
        fontSize: "11.5px",
        fontFamily: MONO,
        color: C.sub,
        background: C.inner,
        border: "1px solid " + C.border,
        outline: "none",
      },
      select: {
        padding: "5px 8px",
        borderRadius: "8px",
        fontSize: "12px",
        fontFamily: FONT,
        color: C.sub,
        background: C.inner,
        border: "1px solid " + C.border,
        outline: "none",
        cursor: "pointer",
      },
      btn: (primary) => ({
        padding: "6px 14px",
        borderRadius: "8px",
        fontSize: "12px",
        fontFamily: FONT,
        cursor: "pointer",
        color: primary ? "#0d0d0d" : C.sub,
        background: primary ? "#e6e6e6" : "rgba(255,255,255,0.045)",
        border: "1px solid " + (primary ? "#e6e6e6" : C.border),
        transition: "opacity 120ms ease",
      }),
      pill: (on) => ({
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        fontSize: "11px",
        padding: "2px 8px",
        borderRadius: "999px",
        color: on ? C.green : C.faint,
        background: on ? "rgba(62,207,142,0.10)" : "rgba(150,155,162,0.08)",
        border: "1px solid " + (on ? "rgba(62,207,142,0.26)" : C.borderSoft),
      }),
      dotLive: (on) => ({
        width: "5px",
        height: "5px",
        borderRadius: "50%",
        background: on ? C.green : C.faint,
      }),
      pre: {
        margin: "0",
        padding: "12px 14px",
        maxHeight: "300px",
        overflow: "auto",
        background: C.inner,
        fontFamily: MONO,
        fontSize: "11px",
        lineHeight: "1.72",
        color: C.dim,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        tabSize: "2",
      },
      hint: { fontSize: "11px", color: C.faint, marginTop: "10px", lineHeight: "16px" },
    };

    function Toggle(props) {
      const on = !!props.value;
      return h(
        "button",
        {
          onClick: () => props.onChange(!on),
          "aria-pressed": on,
          style: {
            width: "36px",
            height: "20px",
            borderRadius: "999px",
            border: "1px solid " + (on ? "rgba(62,207,142,0.42)" : C.border),
            background: on ? "rgba(62,207,142,0.18)" : "rgba(255,255,255,0.05)",
            position: "relative",
            cursor: "pointer",
            padding: "0",
            flex: "0 0 auto",
            transition: "background 140ms ease, border-color 140ms ease",
          },
        },
        h("span", {
          style: {
            position: "absolute",
            top: "2px",
            left: on ? "18px" : "2px",
            width: "14px",
            height: "14px",
            borderRadius: "50%",
            background: on ? C.green : "rgba(170,175,182,0.55)",
            transition: "left 140ms ease, background 140ms ease",
          },
        }),
      );
    }

    function Stat(props) {
      return h(
        "div",
        { style: s.stat },
        h("div", { style: s.statLabel }, props.label),
        h("div", { style: s.statValue, title: props.title || "" }, props.value),
      );
    }

    function Row(props) {
      return h(
        "div",
        { style: props.first ? Object.assign({}, s.row, s.rowFirst) : s.row },
        h(
          "div",
          { style: { minWidth: "0" } },
          h("div", { style: s.rowTitle }, props.title),
          props.desc ? h("div", { style: s.rowDesc }, props.desc) : null,
        ),
        h("div", { style: { flex: "0 0 auto", display: "flex", alignItems: "center" } }, props.children),
      );
    }

    function Breakdown(props) {
      const b = props.breakdown || {};
      const total = Object.keys(b).reduce((sum, k) => sum + (b[k] || 0), 0);
      if (!total) return null;
      const items = SEGMENTS.filter((seg) => (b[seg.key] || 0) > 0);
      return h(
        "div",
        null,
        h(
          "div",
          { style: s.bar },
          items.map((seg) =>
            h("div", {
              key: seg.key,
              title: seg.label + " · " + fmtBytes(b[seg.key]),
              style: {
                width: ((b[seg.key] / total) * 100).toFixed(2) + "%",
                background: seg.color,
                opacity: 0.9,
              },
            }),
          ),
        ),
        h(
          "div",
          { style: s.legend },
          items.map((seg) =>
            h(
              "div",
              { key: seg.key, style: s.legendItem },
              h("span", { style: s.dot(seg.color) }),
              h("span", null, seg.label),
              h("span", { style: { color: C.faint, fontVariantNumeric: "tabular-nums" } }, fmtBytes(b[seg.key])),
            ),
          ),
        ),
      );
    }

    function Panel() {
      const [status, setStatus] = useState(null);
      const [preview, setPreview] = useState("");
      const [busy, setBusy] = useState("");
      const [msg, setMsg] = useState("");
      const [error, setError] = useState("");
      const [root, setRoot] = useState("");
      const [budget, setBudget] = useState("60000");

      const load = useCallback(
        () =>
          api("/status").then((d) => {
            if (!d || d.ok === false) {
              setError((d && d.error) || "读取状态失败，插件可能未就绪");
              return;
            }
            setError("");
            setStatus(d);
            setRoot(d.resolvedRoot || d.config.workbuddyRoot || "");
            setBudget(String(d.config.maxBytes || 60000));
          }),
        [],
      );

      useEffect(() => {
        load();
      }, [load]);

      const patch = (body, label) => {
        setBusy(label);
        setMsg("");
        return api("/config", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        })
          .then((d) => {
            if (!d || d.ok === false) setMsg((d && d.error) || "保存失败");
            return load();
          })
          .finally(() => setBusy(""));
      };

      const doRefresh = () => {
        setBusy("render");
        setMsg("");
        api("/render", { method: "POST" })
          .then((d) => {
            load();
            const r = d && d.result;
            setMsg(d && d.ok ? "已重算 " + fmtBytes(r.bytes) + "，下一轮请求生效" : "失败：" + ((r && r.error) || "未知错误"));
          })
          .finally(() => setBusy(""));
      };

      const doPreview = () => {
        setBusy("preview");
        setMsg("");
        api("/preview")
          .then((d) => {
            if (d && d.ok) {
              setPreview(d.text || "");
              setMsg(fmtBytes(d.bytes) + " / " + fmtBytes(d.maxBytes) + (d.truncated ? " · 已截断" : ""));
            } else {
              setMsg((d && d.error) || "预览失败");
            }
          })
          .finally(() => setBusy(""));
      };

      const cfg = (status && status.config) || {};
      const cache = (status && status.cache) || null;
      const enabled = cfg.enabled !== false;

      if (!status && !error) {
        return h("div", { style: s.panel }, h("div", { style: { fontSize: "12px", color: C.dim, padding: "8px 0" } }, "读取中…"));
      }
      if (!status && error) {
        return h(
          "div",
          { style: s.panel },
          h("div", { style: s.title }, "记忆注入"),
          h("div", { style: Object.assign({}, s.intro, { color: C.red }) }, error),
          h(
            "button",
            { style: Object.assign({}, s.btn(false), { marginTop: "12px" }), onClick: load },
            "重试",
          ),
        );
      }

      return h(
        "div",
        { style: s.panel },
        h(
          "div",
          { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" } },
          h(
            "div",
            null,
            h("div", { style: s.title }, "记忆注入"),
            h(
              "div",
              { style: s.intro },
              "WorkBuddy 的 SOUL / USER / MEMORY / topics 直接注入 DSH 的 system prompt。不落副本、不写 AGENTS.md，两边读的永远是同一份 Markdown。",
            ),
          ),
          h(
            "div",
            { style: { display: "flex", gap: "6px", flex: "0 0 auto", paddingTop: "2px" } },
            h("span", { style: s.pill(enabled) }, h("span", { style: s.dotLive(enabled) }), enabled ? "注入中" : "已关闭"),
            cache && cache.truncated ? h("span", { style: s.pill(false) }, "已截断") : null,
          ),
        ),

        h(
          "div",
          { style: s.card },
          h(
            "div",
            { style: s.cardHead },
            h("div", { style: s.cardTitle }, "注入概览"),
            h(
              "div",
              { style: { fontSize: "11px", color: C.faint, fontVariantNumeric: "tabular-nums" } },
              "上限 " + fmtBytes(cache ? cache.maxBytes : cfg.maxBytes),
            ),
          ),
          h(
            "div",
            { style: s.cardBody },
            h(
              "div",
              { style: s.stats },
              h(Stat, {
                label: "正文字节",
                value: cache ? fmtBytes(cache.bytes) : "—",
                title: "注入 system prompt 的字符总量",
              }),
              h(Stat, {
                label: "约合 token",
                value: cache ? "≈" + (cache.tokensEst || 0).toLocaleString() : "—",
                title: "按中文密度粗估，非精确计数",
              }),
              h(Stat, { label: "主题文件", value: cache ? String(cache.topics || 0) + " 个" : "—", title: "topics/*.md" }),
              h(Stat, {
                label: "注入轮次",
                value: (status.injected || 0) + " 轮",
                title: "插件已参与 system prompt 装配的次数",
              }),
            ),
            cache && cache.breakdown ? h(Breakdown, { breakdown: cache.breakdown }) : null,
            cache && cache.missing && cache.missing.length
              ? h("div", { style: s.hint }, "缺失文件：" + cache.missing.join("、"))
              : null,
            status.lastError ? h("div", { style: Object.assign({}, s.hint, { color: C.red }) }, status.lastError) : null,
          ),
        ),

        h(
          "div",
          { style: s.card },
          h("div", { style: s.cardHead }, h("div", { style: s.cardTitle }, "注入内容")),
          h(
            "div",
            { style: s.cardBody },
            h(
              Row,
              { title: "启用注入", desc: "关闭后 system prompt 不再带记忆段", first: true },
              h(Toggle, { value: enabled, onChange: (v) => patch({ enabled: v }, "enabled") }),
            ),
            h(
              Row,
              { title: "记忆协议", desc: "告诉 agent 何时写、写到哪、怎么写" },
              h(Toggle, { value: cfg.projectMemory !== false, onChange: (v) => patch({ projectMemory: v }, "pm") }),
            ),
            h(
              Row,
              { title: "身份记录", desc: "IDENTITY.md，与 SOUL / USER 内容重叠，默认关闭" },
              h(Toggle, { value: cfg.includeIdentity === true, onChange: (v) => patch({ includeIdentity: v }, "identity") }),
            ),
            h(
              Row,
              { title: "主题文件", desc: "topics/*.md 的处理方式，只放索引最省 token" },
              h(
                "select",
                {
                  value: cfg.topicsMode || "index",
                  onChange: (e) => patch({ topicsMode: e.target.value }, "topics"),
                  style: s.select,
                },
                h("option", { value: "index" }, "只放索引"),
                h("option", { value: "full" }, "全文注入"),
                h("option", { value: "off" }, "不注入"),
              ),
            ),
          ),
        ),

        h(
          "div",
          { style: s.card },
          h("div", { style: s.cardHead }, h("div", { style: s.cardTitle }, "来源与预算")),
          h(
            "div",
            { style: s.cardBody },
            h("label", { style: s.fieldLabel }, "WorkBuddy 记忆源目录"),
            h("input", {
              style: s.input,
              value: root,
              placeholder: "留空自动探测 ~/.workbuddy/user-*-personal",
              onChange: (e) => setRoot(e.target.value),
              onBlur: () => root !== (status.resolvedRoot || "") && patch({ workbuddyRoot: root }, "root"),
              spellCheck: false,
            }),
            h(
              "div",
              { style: { display: "flex", gap: "10px", alignItems: "flex-end", marginTop: "12px" } },
              h(
                "div",
                null,
                h("label", { style: s.fieldLabel }, "字节预算"),
                h("input", {
                  style: Object.assign({}, s.input, { width: "120px" }),
                  value: budget,
                  onChange: (e) => setBudget(e.target.value.replace(/[^0-9]/g, "")),
                  onBlur: () => patch({ maxBytes: Number(budget) || 60000 }, "budget"),
                }),
              ),
              h(
                "button",
                { style: Object.assign({}, s.btn(false), { marginBottom: "1px" }), onClick: () => api("/detect").then((d) => d && d.root && setRoot(d.root)) },
                "自动探测",
              ),
            ),
            h("div", { style: s.hint }, "超出预算时从主题索引开始截断，SOUL 与 USER 永远保留。"),
          ),
        ),

        h(
          "div",
          { style: { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "14px" } },
          h(
            "button",
            { style: Object.assign({}, s.btn(true), busy ? { opacity: 0.55, cursor: "default" } : null), onClick: doRefresh, disabled: !!busy },
            busy === "render" ? "重算中…" : "重新计算",
          ),
          h(
            "button",
            { style: Object.assign({}, s.btn(false), busy ? { opacity: 0.55, cursor: "default" } : null), onClick: doPreview, disabled: !!busy },
            busy === "preview" ? "读取中…" : "预览正文",
          ),
          h(
            "button",
            { style: Object.assign({}, s.btn(false), busy ? { opacity: 0.55, cursor: "default" } : null), onClick: () => load(), disabled: !!busy },
            "刷新状态",
          ),
          msg ? h("span", { style: { fontSize: "11.5px", color: C.dim } }, msg) : null,
        ),

        preview
          ? h(
              "div",
              { style: Object.assign({}, s.card, { marginTop: "12px" }) },
              h(
                "div",
                { style: s.cardHead },
                h("div", { style: s.cardTitle }, "注入正文"),
                h(
                  "div",
                  { style: { fontSize: "11px", color: C.faint, fontVariantNumeric: "tabular-nums" } },
                  preview.split("\n").length + " 行",
                ),
              ),
              h("pre", { style: s.pre }, preview),
            )
          : null,
      );
    }

    function apply(ctx) {
      if (!ctx || !ctx.slots || typeof ctx.slots.inject !== "function") return;
      try {
        ctx.slots.inject("settings.section", () =>
          ctx.slots.register(
            {
              name: "settings.section",
              id: "wb-memory",
              order: 95,
              label: "记忆",
            },
            Panel,
          ),
        );
      } catch (e) {
        try {
          console.warn("[dsh-wb-memory] settings section skipped:", e);
        } catch {
          /* ignore */
        }
      }
    }

    exports.name = name;
    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  },
});
