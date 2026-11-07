# 0.1.4

维护版本：**功能代码零改动**，`src/` 与 `cordis.patch.yml` 和 0.1.3 完全一致。本版只放宽宿主兼容声明，并写明「哪个插件版本支持哪个宿主版本」。

## 为什么发这一版

`0.1.3` 把 `engines.dsh` 写成 `>=0.2.1-rc.2 <=0.2.1-rc.5`。宿主 0.2.2-rc.1 的 `dsh-app-boot` 会做硬性兼容性校验（`evaluatePluginCompatibility`，semver 带 `includePrerelease`），这个上限判定为 **false**，插件被拒绝加载，诊断是「Running it may cause crashes or data loss」。

这不是功能问题：本插件是纯 cordis 插件，**不打宿主补丁、不改宿主源码**。把官方 0.2.2-rc.1 的安装包解开逐项核查后，它依赖的接口全都在。所以修复只需把范围放宽到 `>=0.2.1-rc.2 <0.2.3-0`，与 `dsh-purge-lite 1.5.0-lite` 保持一致。

## 版本支持矩阵

| 插件版本 | `engines.dsh` | 0.2.1-rc.2 | 0.2.1-rc.5 | 0.2.2-rc.1 | 说明 |
|---|---|---|---|---|---|
| `≤ 0.1.2` | 未声明 | 完整 | 完整 | 可运行（未声明） | 宿主不做版本门，功能代码与 0.1.4 相同；市场显示「未声明宿主要求」 |
| `0.1.3` | `>=0.2.1-rc.2 <=0.2.1-rc.5` | 完整 | 完整 | **拒绝加载** | 上限挡住新宿主；已由 0.1.4 取代，勿用 |
| **`0.1.4`** | `>=0.2.1-rc.2 <0.2.3-0` | **完整** | **完整** | **完整** | 首个正式声明并验证支持 0.2.2-rc.1 的版本 |

按宿主版本选插件：

| 宿主版本 | 推荐插件版本 |
|---|---|
| `0.2.1-rc.2` / `0.2.1-rc.5` | `0.1.4` |
| `0.2.2-rc.1` | **只能 `0.1.4`**（`0.1.3` 会被拒绝加载） |

同一张矩阵也写在 README「版本支持矩阵」章节与 `CHANGELOG.md`。

## 为什么不用改代码

官方 0.2.2-rc.1 保留了本插件依赖的每一个接口，签名都没有破坏性变化：

- `system-prompt/assemble` waterfall 的 `(assembly, context, next)` 调用与 `assembly.sections[]`（含 `name` / `text`）结构；
- `webServer.register({ kind: "prefix", handler })` —— 新版新增了 `resource` 形式，但 `handler(req, res)` 分支仍在；
- `commands.register` 的 `input.hint` 校验与 `CommandResult` 的 `success` / `error` 结构；
- 前端 `ctx.slots.inject("settings.section", …)`、`window.__ModuleLoader__`、`dsh.client.inject` 的 `@deepseek-ai/dsh-client-ui-slots`；
- `cordis.patch.yml` 的 `insert` 语法与 `inject: [systemPrompt, webServer]` 声明式依赖。

cordis 由 `4.0.5` 升到 `4.1.0`，仍满足 `peerDependencies` 的 `^4.0.1`；且宿主在有 `engines.dsh` 时不再校验 peer，peer 不是加载门槛。

## 验证口径

从官方安装包解出 `app.asar`，用**真实的新版 cordis 4.1.0 + 真实 `dsh-system-prompt` 0.2.2-rc.1**（不是 mock）跑完整装配，14 项集成断言全过：

- 记忆段出现在装配结果里，且落在 `dsh-purge:anchor` 之前；
- 正文真实渲染（约 8 KB），含身份 / 画像 / 记忆协议，并进入最终 system prompt；purge 段保留；
- 下游 waterfall 抛错时仍注入（容错分支）；
- `prefix` 路由带 `handler` 注册成功，`/memory` 命令注册成功且 `status` 返回合法 `CommandResult`；
- `enabled=false` 时停止注入。

另外 `verify/all.mjs` 全量自测 **50 / 0**，真实 `~/.dsh` 目录快照前后哈希一致，本插件源码保持干净。

**边界**：这是离线集成验证，证明插件在新宿主运行时上装配、路由、命令都能跑通，**不等于升级后模型行为已验证**。请在升完宿主后发一条消息，并用 `/memory` 人工确认注入轮次增长。

## 升级到宿主 0.2.2-rc.1 的顺序

1. 把本插件更新到 **0.1.4**（市场点「更新」，或用本页 `dsh-wb-memory-0.1.4.zip`）。
2. 第三方 `dsh-ops 0.4.4` 声明 `<0.2.2-0`，**须先升到 `0.5.0`**，否则宿主会拒绝加载它。
3. `dsh-purge-lite` 须用 **`1.5.0-lite`**：更早版本在新宿主上有 11 条补丁失配，破甲功能残缺。
4. 覆盖安装 0.2.2-rc.1 会还原 `app.asar`，purge 的宿主补丁要重新解包并 `--apply --status`；`app-update.yml` 会恢复官方 nightly 源，要锁版本需再改回 `disabled.invalid`。
5. 重启 DSH（官方桌面宿主禁用自重启），用 `/memory` 确认注入生效。

## 升级本插件

市场点「更新」会从仓库重新拉取并替换插件目录；也可以下载本页 `dsh-wb-memory-0.1.4.zip`，解压后整体替换 `<DSH_HOME>/profiles/desktop/node_modules/dsh-wb-memory`。配置存在 `<DSH_HOME>/dsh-wb-memory/config.json` 与 profile 的 `cordis.patch.yml`，不随源码替换丢失。

因为本版没改代码，从 `0.1.0`～`0.1.3` 升级都不需要改任何配置。
