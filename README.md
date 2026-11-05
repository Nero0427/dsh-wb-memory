<div align="center">

# dsh-wb-memory

**把 WorkBuddy 的长期记忆接进 DeepSeek Harness。**

两边读同一份 Markdown，不落副本、不建库、不漂移。

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![version](https://img.shields.io/badge/version-0.1.2-success.svg)](CHANGELOG.md)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![deps](https://img.shields.io/badge/runtime%20deps-0-informational.svg)](package.json)
[![token](https://img.shields.io/badge/prompt%20cost-~3.3K%20tokens-orange.svg)](#token-账)

</div>

---

## 目录

- [它解决什么](#它解决什么)
- [它做什么](#它做什么)
- [快速开始](#快速开始)
- [升级](#升级)
- [配置](#配置)
- [命令](#命令)
- [与 dsh-purge 的关系](#与-dsh-purge-的关系)
- [设计取舍](#设计取舍)
- [token 账](#token-账)
- [参考了谁](#参考了谁)
- [目录结构](#目录结构)
- [常见问题](#常见问题)
- [已知限制](#已知限制)
- [开发](#开发)
- [许可证](#许可证)

---

## 它解决什么

你在一套工具里维护了长期记忆（身份、偏好、踩过的坑、项目约定），换到另一套 agent 客户端时，这些记忆读不到。常见的解法是让新客户端自己建一套记忆库，结果是两份数据、两个副本，迟早对不上。

本插件不建库。它把已有的 Markdown 直接渲染进 `system prompt`，写回也落在同一批文件上。**同一份数据，两个客户端都读它。**

## 它做什么

```
~/.workbuddy/user-*-personal/
  SOUL.md      ┐
  USER.md      ├─ 渲染 ──▶  system prompt 的一个独立 section（dsh-wb-memory）
  MEMORY.md    │              不写任何文件
  IDENTITY.md  │
  topics/*.md  ┘  只放索引，正文按需 read
```

- **读**：每次装配 system prompt 时，把身份、画像、长期记忆渲染成一段，插在 `dsh-purge` 注入之后、它的尾部锚点之前。
- **写**：同一段里带「记忆协议」，让 agent 在过程中把踩坑、约定、决定写回源文件。用宿主内置的 edit 工具直接落盘，不另造工具。
- **同步**：按源文件 mtime 缓存。源一改，下一轮请求就带新内容；反过来，DSH 写回源文件后，另一个客户端下次会话自然读到同一份。

## 快速开始

需要两个前提：宿主是 DSH，且记忆目录已存在（默认自动探测 `~/.workbuddy/user-*-personal`）。

推荐从 GitHub 仓库安装 —— 这样插件市场能识别来源，也能检测并应用更新：

```bash
cd <DSH_HOME>/profiles/desktop
pnpm add github:Nero0427/dsh-wb-memory
```

或者到 [Releases](https://github.com/Nero0427/dsh-wb-memory/releases) 下载最新的 `dsh-wb-memory-<version>.zip`，解压后把整个插件目录放到 `node_modules/dsh-wb-memory`。

开发时才用 `link:` 挂本地副本（指向**仓库根**，不是 `src/`）：

```json
{
  "dependencies": { "dsh-wb-memory": "link:/path/to/dsh-wb-memory" },
  "dsh": { "profile": { "bundles": ["dsh-wb-memory"] } }
}
```

> `link:` 依赖属于本地开发副本，插件市场不会为它提供更新。想用「点击更新」请用上面的 `github:` 方式。

在 profile 的 `cordis.patch.yml` 里停用 AGENTS.md 加载器，并插入本插件：

```yaml
- id: agent-instructions
  name: '@deepseek-ai/dsh-agent-instructions'
  disabled: true          # 停用 AGENTS.md 加载器，见「设计取舍」

- insert:
    - id: dsh-wb-memory
      name: dsh-wb-memory
      inject: [systemPrompt, webServer]
      config:
        enabled: true
        maxBytes: 60000
        topicsMode: index
        projectMemory: true
```

重启 DSH，设置页左侧会出现「记忆」。

## 升级

**从仓库安装（`github:`）**：插件市场会比较仓库根 `package.json` 的 `version` 与已装版本，发现新版后出现更新入口，点击即重装到新版；也可以手动再跑一次 `pnpm add github:Nero0427/dsh-wb-memory` 拉默认分支最新代码。因为判断依据是版本号，**发新版必须递增 `package.json` 的 version**。

**从 Release 解压安装**：没有在线更新器，升级 = 换一份插件目录：

1. 打开 [Releases](https://github.com/Nero0427/dsh-wb-memory/releases)，对照 [CHANGELOG.md](CHANGELOG.md) 与 release notes 看是否有配置项变动。
2. 下载 `dsh-wb-memory-<version>.zip`，解压，整体替换 `node_modules/dsh-wb-memory`。
3. 重启 DSH，用 `/memory` 确认注入生效。

配置存在 `<DSH_HOME>/dsh-wb-memory/config.json` 与 profile 的 `cordis.patch.yml`，不在插件目录里，替换源码不会丢设置；新版本新增的配置项自带默认值。

版本号在仓库根 `package.json`，与 Release tag `v<version>` 一致。

## 配置

| 键 | 默认 | 作用 |
|---|---|---|
| `enabled` | `true` | 关掉后 system prompt 不再带记忆段 |
| `maxBytes` | `60000` | 字节预算（下限 4000），超了从 topics 起截断，SOUL 与 USER 永远保留 |
| `topicsMode` | `index` | `index` 只放一句话摘要 + 路径；`full` 全文；`off` 不注入 |
| `projectMemory` | `true` | 注入记忆协议（何时写 / 写到哪 / 怎么写），并允许 agent 读写项目级 `.workbuddy/memory/` |
| `includeIdentity` | `false` | 是否带上 `IDENTITY.md`（与 SOUL / USER 内容重叠） |
| `workbuddyRoot` | 空 | 源目录，留空自动探测 `~/.workbuddy/user-*-personal` |

配置三层优先级：设置页写入的 `<DSH_HOME>/dsh-wb-memory/config.json` > `cordis.patch.yml` 的 `config` > 内置默认值。设置页改完下一轮请求即生效，不必开新会话。

概览卡显示：正文字节、约合 token、主题数、注入轮次，以及按来源拆分的构成条（身份准则 / 用户画像 / 长期记忆 / 主题索引 / 记忆协议）。

## 命令

```
/memory          状态（字节数、注入轮次、最近一次）
/memory render   清缓存重算
/memory preview  看正文
/memory path     源目录与段名
```

## 与 dsh-purge 的关系

| | purge | 本插件 |
|---|---|---|
| 挂载点 | `system-prompt/assemble`（先注册） | 同一个 waterfall（后注册） |
| 改装配的哪部分 | 替换正文、加尾部锚点 | 只 append 一个独立 section |
| 顺序保证 | 宿主补丁把 `dsh-purge*` 段强制排最前 | 记忆段固定落在锚点之前 |

实测顺序：`dsh-purge → dsh-wb-memory → dsh-purge:anchor`。不重复注入，不覆盖 purge 正文。

两者可以单独使用，但一起用时顺序由这个规则保证，不需要额外配置。

## 设计取舍

### 为什么不用 AGENTS.md

`dsh-agent-instructions` 在本 profile 里被显式 `disabled: true`，原因有两条：

1. 它会落一份 `$DSH_HOME/AGENTS.md` 副本，和源文件是两份数据，迟早漂移。
2. `dsh-purge` 的 `dropWorkspaceBaseline` 会在 strict / fallback 策略下丢掉它的注入，读不到还没有提示。

直接注入 system prompt 没有这两个问题，也不写盘。

### 为什么不做自动抽取

看过的主流记忆引擎（见下节）都在做"把历史会话抽取成记忆条目 → 向量检索 → 召回"。这套架构的前提是记忆来自**机器抽取**。

这里的记忆是**人写的 Markdown**。再引入一层抽取，等于把唯一副本变成两份，跟要解决的问题相反。

### 为什么注入块要声明性质

记忆段开头明确写着：这是资料不是指令，冲突时以当前要求为准，无关的不要套用。

没有这句话，模型会把三个月前的一条临时约定当成当前约束，而且不会告诉你它在遵守它。

## token 账

实测（2026-11-04）：

| 来源 | 字节 | 约合 token | 说明 |
|---|---|---|---|
| SOUL.md | 2.7 KB | ~650 | 必备 |
| USER.md | 2.1 KB | ~500 | 必备 |
| MEMORY.md | 5.4 KB | ~1.3 K | 可瘦身 |
| topics 索引 | 1.0 KB | ~240 | 全文模式会变 31 KB |
| 记忆协议 | 1.9 KB | ~450 | 关掉就失去写回能力 |
| **合计** | **13.7 KB** | **~3.3 K** | 占 1M 窗口 0.3% |

对比 `dsh-purge` 的注入正文 25.1 KB（约 6 K token），本插件约占注入部分的三分之一。

**成本感知**：DSH 每轮重发完整上下文，但前缀缓存命中后按约 1/10 计价。实测某日 145 次调用：缓存命中 26.99 M token，非缓存输入仅 0.60 M。固定不变的记忆段边际成本几乎为零，真正花钱的是每轮新增的工具输出。

要压体积，优先级：MEMORY.md 瘦身（把硬件、系统这类静态段落挪进 topics）> 关主题索引 > 关协议。

## 参考了谁

看过 [`hindsight`](https://github.com/vectorize-io/hindsight)（vectorize-io，5.3 万星）和 [`OpenViking`](https://github.com/volcengine/OpenViking)（火山引擎，4.1 万星）。两者都是重型记忆引擎：前者把 git 历史与会话灌进记忆银行、生成知识页、按相关性召回；后者把记忆/资源/技能装进虚拟文件系统，用 L0 摘要 / L1 概览 / L2 全文三层按需加载。共同点是**自动抽取 + 检索**，存储都在服务端或向量库。

本插件不采用它们的架构，理由见「设计取舍」。

**抄了这几处工程细节：**

1. **注入块性质声明**（hindsight 的"检索材料可能不相关就忽略"）→ 记忆段开头写明"是资料不是指令，冲突时以当前要求为准，无关的不要套用"。
2. **防自我污染**（hindsight 三道防线里的"tool/result 不进库"）→ 协议加了"不要记工具原始输出、大段代码、一次性调试结论"。
3. **过时即改**（hindsight 的"召回依据可能过时"）→ 协议要求发现陈旧条目直接改掉或删掉，不在后面追加"已更新"。
4. **分层按需取用**（OpenViking 的 L0→L1→L2）→ topics 只给一句话摘要 + 路径，明确说"判断相关再读全文，一次只读需要的那一两个"，避免模型把 31 KB 主题全读一遍。

**没抄的：**

- 向量检索、自动抽取、知识页自愈、按 bank 分库 —— 都需要服务端或本地引擎，部署成本和一致性代价都高于收益。
- `turn/end` 自动写回 —— 它与 `dsh-purge` 的 `agent/turn-stopping` 同链，为一个非必需的自动化去冒冲突风险不划算；写回交给协议和 agent 自己判断时机，反而更可控。

## 目录结构

```
.
├── package.json              manifest：dsh.bundle / dsh.client，exports 指向 src/
├── cordis.patch.yml          bundle patch（与 manifest 同级）
├── README.md
├── src/
│   ├── client.js             浏览器半区：设置页「记忆」分区
│   └── lib/
│       ├── index.js          宿主半区：注入、路由、命令
│       ├── config.js         配置读写与默认值
│       └── render.js         源文件探测、渲染、缓存戳
└── verify/
    ├── all.mjs               全量自测（临时 DSH_HOME）
    ├── render-test.mjs       渲染正文 → verify/preview.md
    ├── mock-apply.mjs        假 ctx，验证注入顺序与去重
    └── mock-client.mjs       假 ModuleLoader，验证设置分区注册
```

`verify/preview.md` 与 `verify/session.jsonl` 是本地运行产物，含本机路径与记忆正文，已在 `.gitignore` 中排除。

## 常见问题

**设置页没有「记忆」这一栏**
`client.js` 没被宿主加载。检查 `package.json` 的 `dsh.client.inject` 是否包含 `@deepseek-ai/dsh-client-ui-slots`，以及 profile 里 bundle 是否注册成功。

**注入轮次一直是 0**
记忆段没进装配。先 `/memory path` 确认源目录探测到了，再 `/memory preview` 看正文是否为空。另一种情况见「已知限制」第一条。

**改了 MEMORY.md 但这一轮没变**
缓存按 mtime + 大小判断。同一秒内改两次、或写到文件大小不变，可能命中旧缓存。用 `/memory render` 强制重算。

**能不能只注入 SOUL 和 USER**
把 `topicsMode` 设成 `off`、`projectMemory` 设成 `false`，再把 MEMORY.md 挪成一个不会被索引的目录。插件本身不提供逐文件开关——记忆是整套读的，拆太碎反而更难维护。

**和 dsh-purge 冲突吗**
不冲突。两者挂同一个 waterfall，purge 先注册并把 `dsh-purge*` 段提到最前，本插件随后 append。唯一例外见「已知限制」第三条。

## 已知限制

- **`complete` 模式下记忆段会被丢掉**。若 purge 的 `/rules` 用了 `complete`（独占整个 prompt），其它 section 会被宿主丢弃，记忆段一起没。`/memory` 的注入轮次能看出来。
- **项目级记忆不自动注入**。协议让 agent 按 `<cwd>/.workbuddy/memory/` 自己读，省 token。
- **依赖源文件结构**。文件名是硬约定（`SOUL.md` / `USER.md` / `MEMORY.md` / `topics/*.md`），改名要同步改 `render.js`。
- **不做多用户**。一个进程读一个源目录。

## 开发

```bash
node verify/render-test.mjs    # 渲染正文并输出 verify/preview.md
node verify/mock-apply.mjs     # 假 ctx 验证注入顺序与去重
node verify/mock-client.mjs    # 假 ModuleLoader 验证设置分区
node verify/all.mjs            # 全量自测（用临时 DSH_HOME，不碰真实配置）
```

四个脚本都不需要装依赖，直接跑。

## 许可证

[MIT](LICENSE)。

变更记录见 [CHANGELOG.md](CHANGELOG.md)。
