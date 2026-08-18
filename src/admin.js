import { config } from './config.js';

export function isAdminSender(msg) {
  const senderId = msg && msg.senderId;
  if (!senderId || !config.adminOpenids.length) return false;
  return config.adminOpenids.includes(senderId);
}
