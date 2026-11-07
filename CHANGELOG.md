# Changelog

本项目所有值得记录的变更都写在这里。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Planned

- 逐段开关（当前只有整套开关，拆到单文件会显著增加配置复杂度，待定）。
- 主题文件按关键词预筛，替代"只放索引"与"全文注入"两档粗粒度选择。

## [0.1.4] - 2026-11-07

维护版本，**功能代码零改动**（`src/` 与 `cordis.patch.yml` 与 0.1.3 完全一致）。

### Changed

- `engines.dsh` 从 `>=0.2.1-rc.2 <=0.2.1-rc.5` 放宽到 `>=0.2.1-rc.2 <0.2.3-0`。0.1.3 的上限会让宿主 0.2.2-rc.1 的 `dsh-app-boot` 兼容性校验拒绝加载本插件，这是新版唯一的阻断项。
- README「快速开始」的宿主范围改为 0.2.1-rc.2 ～ 0.2.2-rc.1，新增[版本支持矩阵](README.md#版本支持矩阵)。

### Added

- **版本支持矩阵**（README / 本文件 / release notes 三处一致）：明确写出每个插件版本支持哪些宿主版本、以及每个宿主版本该装哪个插件版本。

| 插件版本 | `engines.dsh` | 0.2.1-rc.2 | 0.2.1-rc.5 | 0.2.2-rc.1 |
|---|---|---|---|---|
| `≤ 0.1.2` | 未声明 | 完整 | 完整 | 可运行（未声明） |
| `0.1.3` | `>=0.2.1-rc.2 <=0.2.1-rc.5` | 完整 | 完整 | **拒绝加载** |
| **`0.1.4`** | `>=0.2.1-rc.2 <0.2.3-0` | **完整** | **完整** | **完整** |

### Verified

- 官方 0.2.2-rc.1 保留了全部依赖接口：`system-prompt/assemble` waterfall 签名与 `sections[]` 结构、`webServer.register({ kind: "prefix", handler })`、`commands.register` 的 `input.hint` / `CommandResult`、`ctx.slots.inject("settings.section", …)`、`window.__ModuleLoader__`、bundle patch 的 `insert` 语法；cordis `4.1.0` 满足 `^4.0.1`。
- 用**真实的新版 cordis 4.1.0 + 真实 `dsh-system-prompt` 0.2.2-rc.1**（非 mock）跑装配：14 项集成断言全过（记忆段落在 `dsh-purge:anchor` 之前、正文进入最终 prompt、purge 段保留、下游抛错仍注入、prefix 路由与 `/memory` 命令注册成功、`enabled=false` 停止注入）。
- `verify/all.mjs` 50 项自测全过；真实 `~/.dsh` 快照前后一致。

### Notes

- 这是离线集成验证，不等于运行时模型行为已验证。升级宿主后请发一条消息并用 `/memory` 人工确认注入。
- 升到 0.2.2-rc.1 前，第三方 `dsh-ops 0.4.4` 须先升到 `0.5.0`；`dsh-purge-lite` 须用 `1.5.0-lite`（更早版本在新宿主上补丁残缺）。
- 与 `dsh-purge-lite` 不同，本插件不打宿主补丁，因此宿主升级不需要重写任何 pattern。

## [0.1.3] - 2026-11-07

维护版本，代码未改。

### Added

- `package.json` 声明 `engines.dsh: ">=0.2.1-rc.2 <=0.2.1-rc.5"`；插件市场与宿主据此判定宿主兼容性，卡片不再显示「未声明宿主要求」。
- README「快速开始」写明宿主支持范围，补充插件市场收录说明（awesome-dsh-plugin PR #12160）与一键安装方式。

## [0.1.2] - 2026-11-05

维护版本，代码未改。

### Added

- README 与 release notes 说明：市场比较仓库根 `package.json` 的 `version` 判断新版，只推 commit 不递增版本号不会提示更新。
- 明确 `github:` 安装与 `link:` 开发副本在更新通道上的差异。

### Notes

- 递增版本号供更新链路检测；从 `github:` 安装的 profile 可以点击升级到本版本。

## [0.1.1] - 2026-11-05

功能不变，调整仓库布局，使其能从 GitHub 仓库安装并被插件市场更新。

### Changed

- `package.json` 从 `src/` 移到仓库根，声明 `dsh.bundle` / `dsh.client`；`exports` 改指向 `src/lib/index.js` 与 `src/client.js`。
- `cordis.patch.yml` 从 `src/` 移到仓库根，与 manifest 同级。
- 发版工作流改读根 `package.json` 的版本号。

### Fixed

- 仓库根缺 `package.json` 导致市场读不到版本，`github:` 安装与「点击更新」都无法成立；`link:` 依赖本身也不在更新通道内。

## [0.1.0] - 2026-11-04

首个可用版本。

### Added

- **宿主半区**（`src/lib/index.js`）：挂 `system-prompt/assemble`，把记忆渲染成独立 section 注入，落在 `dsh-purge` 段之后、其尾部锚点之前。不写任何文件。
- **渲染层**（`src/lib/render.js`）：探测 `~/.workbuddy/user-*-personal`，按 `SOUL.md` / `USER.md` / `MEMORY.md` / `topics/*.md` 渲染，按 mtime + 大小做缓存戳；带字节预算截断，SOUL 与 USER 永不截断。
- **配置层**（`src/lib/config.js`）：默认值 ← `cordis.patch.yml` ← 设置页 `config.json` 三级覆盖，写入走临时文件 + rename 原子落盘。
- **浏览器半区**（`src/client.js`）：设置页新增「记忆」分区，含开关组、来源与预算卡、概览卡（字节 / 约合 token / 主题数 / 注入轮次 / 来源构成条）。
- **命令**：`/memory`、`/memory render`、`/memory preview`、`/memory path`。
- **自测脚本**（`verify/`）：渲染、假 ctx 注入顺序、假 ModuleLoader 分区注册、全量回归，均用临时 `DSH_HOME`，不碰真实配置。

### Design notes

- 显式停用 `dsh-agent-instructions`，避免 `$DSH_HOME/AGENTS.md` 副本与源文件漂移。
- 注入块开头声明性质（资料而非指令），防止陈旧记忆被当作当前约束。
- 记忆协议要求"发现陈旧条目直接改掉或删掉"，不在后面追加"已更新"。

[Unreleased]: https://github.com/Nero0427/dsh-wb-memory/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/Nero0427/dsh-wb-memory/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/Nero0427/dsh-wb-memory/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/Nero0427/dsh-wb-memory/releases/tag/v0.1.2
[0.1.1]: https://github.com/Nero0427/dsh-wb-memory/releases/tag/v0.1.1
[0.1.0]: https://github.com/Nero0427/dsh-wb-memory/releases/tag/v0.1.0
