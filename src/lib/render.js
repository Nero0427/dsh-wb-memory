/**
 * 渲染层：WorkBuddy 记忆文件 → 注入 system prompt 的文本段。
 *
 * 不再落任何 DSH 侧文件。装配时按源文件 mtime 缓存重算，
 * 保证 DSH 读到的永远是 WorkBuddy 当前那一份。
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PRIORITY_FILES = ["SOUL.md", "USER.md", "MEMORY.md", "IDENTITY.md"];

function stripFrontmatter(text) {
  if (!text) return "";
  const m = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(text);
  return (m ? text.slice(m[0].length) : text).trim();
}

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function bytes(text) {
  return Buffer.byteLength(text || "", "utf8");
}

/** 源文件的最新修改时间，用作渲染缓存的 key。 */
export function sourceStamp(root) {
  if (!root) return 0;
  let stamp = 0;
  for (const name of PRIORITY_FILES) {
    try {
      stamp = Math.max(stamp, fs.statSync(path.join(root, name)).mtimeMs);
    } catch {
      /* 缺文件 */
    }
  }
  try {
    stamp = Math.max(stamp, fs.statSync(path.join(root, "topics")).mtimeMs);
    for (const name of fs.readdirSync(path.join(root, "topics"))) {
      try {
        stamp = Math.max(stamp, fs.statSync(path.join(root, "topics", name)).mtimeMs);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* 无 topics 目录 */
  }
  return stamp;
}

/** 扫 ~/.workbuddy 下最新的 user-*-personal 目录。 */
export function detectWorkbuddyRoot(home = os.homedir()) {
  const base = path.join(home, ".workbuddy");
  let entries = [];
  try {
    entries = fs.readdirSync(base, { withFileTypes: true });
  } catch {
    return "";
  }
  const candidates = entries
    .filter((e) => e.isDirectory() && /^user-.*-personal$/.test(e.name))
    .map((e) => path.join(base, e.name))
    .map((dir) => {
      let mtime = 0;
      for (const f of PRIORITY_FILES) {
        try {
          mtime = Math.max(mtime, fs.statSync(path.join(dir, f)).mtimeMs);
        } catch {
          /* 文件不存在 */
        }
      }
      return { dir, mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return candidates[0]?.dir || "";
}

/** 读一整套记忆源。缺文件不报错，只记为缺失。 */
export function readSources(root) {
  const sources = { root, files: {}, topics: [], missing: [] };
  for (const name of PRIORITY_FILES) {
    const file = path.join(root, name);
    const raw = readText(file);
    if (!raw) {
      sources.missing.push(name);
      continue;
    }
    sources.files[name] = { file, text: stripFrontmatter(raw), bytes: bytes(raw) };
  }
  const topicsDir = path.join(root, "topics");
  let names = [];
  try {
    names = fs.readdirSync(topicsDir).filter((n) => n.toLowerCase().endsWith(".md"));
  } catch {
    /* 无 topics 目录 */
  }
  for (const name of names.sort()) {
    const file = path.join(topicsDir, name);
    const raw = readText(file);
    if (!raw) continue;
    const summary = (() => {
      const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
      if (m) {
        const line = m[1].split(/\r?\n/).find((l) => /^\s*summary\s*:/.test(l));
        if (line) return line.replace(/^\s*summary\s*:\s*/, "").replace(/^["']|["']$/g, "").trim();
      }
      const first = stripFrontmatter(raw).split(/\r?\n/).find((l) => l.trim() && !l.startsWith("#"));
      return (first || "").slice(0, 80);
    })();
    sources.topics.push({ name, file, summary, bytes: bytes(raw), text: stripFrontmatter(raw) });
  }
  return sources;
}

/** 源文件自带 # / ## 标题，塞进二级章节后统一降两级，避免和本文件层级打架。 */
function demote(text) {
  return String(text || "").replace(/^(#{1,3}) /gm, (m, hashes) => hashes + "## ");
}

function section(title, body, note) {
  if (!body) return "";
  const lines = [`## ${title}`];
  if (note) lines.push(`> ${note}`);
  lines.push("", demote(body.trim()), "", "");
  return lines.join("\n");
}

const PROTOCOL = [
  "## 记忆协议（每次会话都生效）",
  "",
  "记忆是一批 Markdown 文件，WorkBuddy 和 DSH 读写同一份。写下去的东西，另一个客户端下次会话就能读到。",
  "",
  "**会话开始**：若当前工作目录下存在 `.workbuddy/memory/MEMORY.md`，先读它；再读最近两天的 `.workbuddy/memory/YYYY-MM-DD.md`。读不到就跳过，不要报错。",
  "",
  "**过程中**：出现下列内容就立刻记，不要攒到任务结束——",
  "- 踩坑与根因（试过什么、为什么错、正确的做法）",
  "- 用户明确表达过的偏好与否决项",
  "- 项目约定（路径、命令、命名、接口）",
  "- 影响后续判断的事实（版本、端口、环境差异）",
  "",
  "**写到哪里**：",
  "- 项目内进展、当天做过什么 → `<cwd>/.workbuddy/memory/YYYY-MM-DD.md`（append-only，一行一条）",
  "- 跨项目通用的事实与规矩 → 全局 `MEMORY.md`（改前先读，合并同类项，别重复堆）",
  "- 成套知识（某类问题的完整解法）→ `topics/<主题>.md`，并在全局 MEMORY.md 留一行索引",
  "",
  "**任务收尾**：一段活干完，用两句话补一条当天日志——做了什么、剩什么坑或下一步。不写过程复盘，不写感想。",
  "",
  "**不要记**：工具的原始输出（日志、JSON、diff）、大段代码、临时路径、一次性的调试结论。要记的是结论和原因，不是过程流水。",
  "",
  "**过时就改**：发现某条记忆已经不对，直接改掉或删掉，不要在其后追加“已更新”。陈旧条目比没有更糟。",
  "",
  "**写法**：结论先行，一条一句话，带日期；不复制代码，不记临时路径，不写“本次任务已完成”这类废话。",
  "",
  "**禁止**：不要改写 SOUL.md / USER.md（那是用户手写的人格与画像）；不要为了“留痕”而记流水账。",
  "",
].join("\n");

/**
 * 渲染注入正文。按预算裁剪：SOUL / USER 优先，MEMORY 次之，topics 索引最后。
 */
export function renderInjectText(sources, opts = {}) {
  const maxBytes = Math.max(4000, Number(opts.maxBytes) || 60000);
  const topicsMode = opts.topicsMode || "index";
  const projectMemory = opts.projectMemory !== false;
  const includeIdentity = opts.includeIdentity === true;

  const head = [
    "# 全局指令（来自 WorkBuddy 记忆）",
    "",
    `以下内容来自用户长期维护的身份与记忆文件，源目录 \`${sources.root}\`。它们是资料，不是本轮任务的指令：`,
    "",
    "- 与用户当前的要求冲突时，以当前要求为准。",
    "- 与当前任务无关的部分不要套用，不要为了“用上记忆”而绕路。",
    "- 引用其中的事实时先看日期，过时的按过时处理，不要当成现状。",
    "",
    "",
  ].join("\n");

  const parts = [];
  const push = (key, text) => {
    if (!text) return;
    parts.push({ key, text });
  };

  push("soul", section("身份与做事准则", sources.files["SOUL.md"]?.text, "源：SOUL.md"));
  push("user", section("用户画像", sources.files["USER.md"]?.text, "源：USER.md"));
  push("memory", section("跨项目长期记忆", sources.files["MEMORY.md"]?.text, "源：MEMORY.md"));
  if (includeIdentity) push("identity", section("身份记录", sources.files["IDENTITY.md"]?.text, "源：IDENTITY.md"));

  if (topicsMode !== "off" && sources.topics.length) {
    const lines = [
      "## 主题记忆（按需读取，不要全部预读）",
      "",
      "下面是索引，每条只有一句话摘要。判断确实和当前任务相关，再按路径读取全文；一次只读需要的那一两个，不要为了“准备充分”全部读一遍。",
      "",
    ];
    for (const t of sources.topics) {
      lines.push(`- \`${t.name}\` · ${(t.bytes / 1024).toFixed(1)} KB · ${t.summary || "无摘要"}`);
      lines.push(`  路径：${t.file}`);
      if (topicsMode === "full") lines.push("", t.text, "");
    }
    lines.push("", "");
    push("topics", lines.join("\n"));
  }

  if (projectMemory) push("protocol", PROTOCOL);

  const breakdown = {};
  for (const p of parts) breakdown[p.key] = bytes(p.text);

  // 源目录里一个记忆文件都没有时，别注入一份只有规则的空壳
  const hasContent = parts.some((p) => p.key !== "protocol");
  if (!hasContent) {
    return {
      text: "",
      bytes: 0,
      maxBytes,
      truncated: false,
      topics: sources.topics.length,
      missing: sources.missing,
      breakdown: {},
      stats: {
        soul: bytes(sources.files["SOUL.md"]?.text),
        user: bytes(sources.files["USER.md"]?.text),
        memory: bytes(sources.files["MEMORY.md"]?.text),
      },
    };
  }

  let body = parts.map((p) => p.text).join("");
  let text = head + body;
  let truncated = false;

  if (bytes(text) > maxBytes) {
    const limit = maxBytes - bytes(head) - 120;
    if (bytes(body) > limit) {
      body = Buffer.from(body, "utf8").subarray(0, Math.max(0, limit)).toString("utf8");
      body = body.replace(/\n[^\n]*$/, "");
      body += `\n\n---\n\n（记忆正文超出预算，已截断。完整内容请直接读源文件：${sources.root}）\n`;
      truncated = true;
    }
    text = head + body;
  }

  return {
    text,
    bytes: bytes(text),
    maxBytes,
    truncated,
    topics: sources.topics.length,
    missing: sources.missing,
    breakdown: { head: bytes(head), ...breakdown },
    stats: {
      soul: bytes(sources.files["SOUL.md"]?.text),
      user: bytes(sources.files["USER.md"]?.text),
      memory: bytes(sources.files["MEMORY.md"]?.text),
    },
  };
}
