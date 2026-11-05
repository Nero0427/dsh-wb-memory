# 0.1.0

首个可用版本。

## 它能做什么

把 WorkBuddy 的 SOUL / USER / MEMORY / topics 渲染成 system prompt 里的一个独立 section，两边读同一份 Markdown，不落副本、不建库。

- 每次装配时重新渲染，按源文件 mtime 缓存，源一改下一轮就带新内容。
- 带记忆协议：告诉 agent 什么时候写、写到哪、怎么写，写回直接落在源文件上。
- 设置页「记忆」分区：开关、字节预算、主题处理方式、来源目录、注入构成概览。
- 命令：`/memory`、`/memory render`、`/memory preview`、`/memory path`。
- 零运行时依赖。

## 安装

下载本页下方的 `dsh-wb-memory-0.1.0.zip`，解压后把 `src/` 挂进 profile：

```json
{
  "dependencies": { "dsh-wb-memory": "link:/path/to/dsh-wb-memory/src" },
  "dsh": { "profile": { "bundles": ["dsh-wb-memory"] } }
}
```

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

重启 DSH 生效。

## 成本

默认配置下注入正文约 13.7 KB，约合 3.3 K token。前缀缓存命中后边际成本接近于零。

## 完整说明

见 [README.md](README.md)，变更记录见 [CHANGELOG.md](CHANGELOG.md)。
