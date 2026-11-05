# 0.1.2

维护版本：补充从仓库安装后的更新判定说明。功能与 0.1.1 完全相同，代码未改。

## 为什么发这一版

0.1.1 把 manifest 提到仓库根，使 `pnpm add github:Nero0427/dsh-wb-memory` 可安装、市场也能读到版本号。但市场判断「有没有新版」比较的是仓库根 `package.json` 的 `version` 与已装版本 —— 只推 commit 而版本号不变，不会提示更新。

递增版本号本身即一次真实更新：已用 `github:` 安装的 profile 会检测到 `0.1.2` 并可以点击升级。`link:` 安装的本地开发副本不在更新通道内，需先改成 `github:` 安装。

## 更新后

市场点「更新」会重新从仓库拉取并替换插件目录。配置存在 `<DSH_HOME>/dsh-wb-memory/config.json` 与 profile 的 `cordis.patch.yml`，不随源码替换丢失。重启 DSH 后用 `/memory` 确认注入生效。

## 安装

推荐从仓库安装：

```bash
cd <DSH_HOME>/profiles/desktop
pnpm add github:Nero0427/dsh-wb-memory
```

或者下载本页的 `dsh-wb-memory-0.1.2.zip`，解压后把整个插件目录放到 `<DSH_HOME>/profiles/desktop/node_modules/dsh-wb-memory`。

## 完整说明

见 [README.md](README.md)，变更记录见 [CHANGELOG.md](CHANGELOG.md)。
