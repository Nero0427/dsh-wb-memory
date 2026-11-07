# 0.1.3

维护版本：声明宿主支持范围、补充插件市场收录说明。**功能与 0.1.2 完全相同，代码未改。**

## 为什么发这一版

0.1.2 之后往 `main` 推了文档与元数据提交，但没有递增版本号。市场按仓库根 `package.json` 的 `version` 判断是否有新版，版本不变时卡片会一直显示「有新提交（未发版）」。递增版本号让 HEAD 对齐一个正式版本。

## 改了什么

- `package.json` 增加 `engines.dsh: ">=0.2.1-rc.2 <=0.2.1-rc.5"`。插件市场与宿主据此判定兼容性，卡片不再显示「未声明宿主要求」。范围用宿主 semver 实测：rc.2 / rc.3 / rc.4 / rc.5 通过，rc.1、rc.6、`0.2.1` 正式版与 `0.2.2-rc.1` 排除。
- README「快速开始」写明宿主支持范围，补充「已加入插件市场」（[awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)，[PR #12160](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/12160)），以及搜索 `Nero0427/dsh-wb-memory` 在市场一键安装。

## 升级

市场点「更新」会重新从仓库拉取并替换插件目录。配置存在 `<DSH_HOME>/dsh-wb-memory/config.json` 与 profile 的 `cordis.patch.yml`，不随源码替换丢失。重启 DSH 后用 `/memory` 确认注入生效。

或者下载本页的 `dsh-wb-memory-0.1.3.zip`，解压后把整个插件目录放到 `<DSH_HOME>/profiles/desktop/node_modules/dsh-wb-memory`。
