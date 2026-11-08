// 對話紀錄只存文字（圖片太大，不存進 localStorage）。每個模式各一個對話串。
import type { ChatMsg } from './chatModel';
import type { Mode } from './modes';

const KEY = (m: Mode) => `sugar-friendly:chat:${m}`;
const MAX = 100;

export function loadChat(m: Mode): ChatMsg[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY(m)) ?? '[]');
    return Array.isArray(v) ? (v as ChatMsg[]).slice(-MAX) : [];
  } catch {
    return [];
  }
}

export function saveChat(m: Mode, msgs: ChatMsg[]) {
  try {
    localStorage.setItem(KEY(m), JSON.stringify(msgs.slice(-MAX)));
  } catch {
    /* 容量不足或被封鎖時略過 */
  }
}
