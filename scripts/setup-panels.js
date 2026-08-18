import { QQBot } from '@tencent-connect/qqbot-nodejs';
import { config } from '../src/config.js';

const SCOPE_LABEL = { c2c: '单聊', group: '群聊', channel: '文字子频道', dm: '频道私信' };

if (!config.appId || !config.appSecret) {
  console.error('[panel] 缺少 APP_ID / APP_SECRET，请检查 .env');
  process.exit(1);
}

const logger = {
  info: () => {},
  error: (...a) => console.error('[panel]', ...a),
  warn: () => {},
  debug: () => {},
};
const bot = new QQBot({ appId: config.appId, appSecret: config.appSecret, logger });

// 单聊面板：点击后填入指令，私聊里直接发送即可触发
const C2C_ITEMS = [
  { type: 'command', name: '下载', desc: '获取下载链接' },
  { type: 'command', name: '更新日志', desc: '获取更新日志' },
  { type: 'command', name: '帮助', desc: '显示帮助列表' },
  { type: 'command', name: 'ping', desc: '连接状态/运行时间' },
];

// 群聊面板：名字带 . 前缀（平台会去掉 /，但保留 .），点击后填入 .下载，不 @ 也能触发
const GROUP_ITEMS = [
  { type: 'command', name: '.下载', desc: '获取下载链接' },
  { type: 'command', name: '.更新日志', desc: '获取更新日志' },
  { type: 'command', name: '.帮助', desc: '显示帮助列表' },
  { type: 'command', name: '.ping', desc: '连接状态/运行时间' },
];

const [, , action = 'create', arg] = process.argv;

async function listPanels() {
  for (const scope of ['c2c', 'group']) {
    const data = await bot.api.get('/v2/panels', { scope, limit: 50 });
    const records = data.records || [];
    console.log(`\n[${SCOPE_LABEL[scope]} 面板] ${records.length} 个`);
    for (const r of records) {
      const names = (r.panel?.items || []).map((i) => i.name).join(', ');
      console.log(`  ${r.panel_id} (${r.target_type}) v${r.version} items=[${names}]`);
    }
  }
}

async function deletePanel(panelId) {
  await bot.api.delete(`/v2/panels/${panelId}`);
  console.log(`[panel] 已删除 ${panelId}`);
}

async function createPanels() {
  const c2c = await bot.api.post('/v2/panels', {
    scope: 'c2c',
    target_type: 'all',
    panel: { items: C2C_ITEMS, remark: 'q.bot 单聊指令面板' },
  });
  console.log(`[panel] 单聊面板已创建 ${c2c.panel_id}`);
  const group = await bot.api.post('/v2/panels', {
    scope: 'group',
    target_type: 'all',
    panel: { items: GROUP_ITEMS, remark: 'q.bot 群聊指令面板（前缀触发）' },
  });
  console.log(`[panel] 群聊面板已创建 ${group.panel_id}`);
}

try {
  switch (action) {
    case 'list':
      await listPanels();
      break;
    case 'delete':
      if (!arg) throw new Error('用法：node scripts/setup-panels.js delete <panel_id>');
      await deletePanel(arg);
      break;
    case 'reset': {
      for (const scope of ['c2c', 'group']) {
        const data = await bot.api.get('/v2/panels', { scope, limit: 50 });
        for (const r of data.records || []) await deletePanel(r.panel_id);
      }
      await createPanels();
      break;
    }
    default:
      await createPanels();
      break;
  }
} catch (err) {
  console.error('[panel] 操作失败：', err.message || err);
  process.exitCode = 1;
} finally {
  bot.stop();
}
