# Changelog

本项目所有值得记录的变更都写在这里。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Planned

- 逐段开关（当前只有整套开关，拆到单文件会显著增加配置复杂度，待定）。
- 主题文件按关键词预筛，替代"只放索引"与"全文注入"两档粗粒度选择。

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

[Unreleased]: https://github.com/Nero0427/dsh-wb-memory/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Nero0427/dsh-wb-memory/releases/tag/v0.1.0
