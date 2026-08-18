import { status } from '../status.js';

function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function formatTime() {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());
}

export const ping = {
  names: ['ping'],
  description: '连接状态/运行时间',
  async execute({ reply }) {
    const lines = [
      `状态：${status.connected ? '在线' : '连接中'}`,
      `时间：${formatTime()}`,
      `已运行：${formatDuration(Math.floor((Date.now() - status.startedAt) / 1000))}`,
    ];
    await reply(lines.join('\n'));
  },
};
