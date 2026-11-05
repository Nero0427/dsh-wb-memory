# 0.1.1

让插件可以从 GitHub 仓库直接安装，并被插件市场识别与更新。功能与 0.1.0 完全一致，只调整仓库布局。

## 改了什么

- `package.json` 与 `cordis.patch.yml` 移到仓库根，声明 `dsh.bundle`，符合 DSH 插件 manifest 规范。
- 源码仍在 `src/`，`exports` 相应指向 `src/lib/index.js` 与 `src/client.js`。
- 市场按仓库根 `package.json` 的 `version` 判断新版；此前根包缺失，读不到版本，只会把 `link:` 安装当成不可更新的本地开发副本。

## 安装

推荐从仓库安装（可被市场管理、可点击更新）：

```bash
cd <DSH_HOME>/profiles/desktop
pnpm add github:Nero0427/dsh-wb-memory
```

或者下载本页的 `dsh-wb-memory-0.1.1.zip`，解压后把整个插件目录放到 `<DSH_HOME>/profiles/desktop/node_modules/dsh-wb-memory`。

profile 的 `cordis.patch.yml` 里停用 AGENTS.md 加载器并插入本插件：

```yaml
- id: agent-instructions
  name: '@deepseek-ai/dsh-agent-instructions'
  disabled: true

- insert:
    - id: dsh-wb-memory
      name: dsh-wb-memory
      inject: [systemPrompt, webServer]
      config: { enabled: true, maxBytes: 60000, topicsMode: index, projectMemory: true }
```

重启 DSH 生效。设置页写入的配置存在 `<DSH_HOME>/dsh-wb-memory/config.json` 与 profile 的 `cordis.patch.yml`，不随安装方式变化。

## 从 0.1.0 升级

旧版把 `package.json` 放在 `src/` 下，仓库根没有 manifest。如果之前用 `link:.../src` 挂载，改成 `github:` 安装即可；`link:` 依赖不会出现在市场的更新列表里。

## 完整说明

见 [README.md](README.md)，变更记录见 [CHANGELOG.md](CHANGELOG.md)。
