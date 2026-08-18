# q.bot

基于 [@tencent-connect/qqbot-nodejs](https://github.com/tencent-connect/qqbot-nodejs) 的 QQ 机器人。

## 环境变量

复制 `.env.example` 为 `.env` 并填写：

- `APP_ID` / `APP_SECRET`：QQ 开放平台机器人凭证
- `CNB_TOKEN`：CNB 仓库访问令牌
- `GITHUB_PROXY`：GitHub API 代理地址
- `HIDE_ASSETS`：下载列表中隐藏的资产名称（逗号分隔）

## 使用

```bash
npm install
npm start        # 生产
npm run dev      # 开发（文件变更自动重启）
```

## 指令触发方式

- 群聊：`@机器人 <指令>`，可加可不加前缀（`. / \`）
- 群聊：不 @ 机器人时，需带前缀 `.指令` `/指令` `\指令` 才会触发
- 私聊：直接发送指令即可，前缀可加可不加
- 未 @ 机器人且未触发指令时，机器人保持沉默
- `@机器人`（无指令）或发送未知指令时，返回帮助列表

GPL-3.0
