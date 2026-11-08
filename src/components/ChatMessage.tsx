import { Fragment, type ReactNode } from 'react';
import Icon from './Icon';
import type { ChatMsg } from '../lib/chatModel';

interface Props {
  msg: ChatMsg;
  thumb?: string;
  streaming: boolean;
  isLastAssistant: boolean;
  speaking: boolean;
  copied: boolean;
  canSpeak: boolean;
  onCopy: () => void;
  onSpeak: () => void;
  onRegen: () => void;
  onDelete: () => void;
}

/** 把模型的簡單 markdown（段落、清單、標題、粗體、引用編號）轉成 React 元素 */
function Rich({ text }: { text: string }) {
  const blocks: { kind: 'p' | 'h' | 'ul' | 'ol'; lines: string[] }[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const num = /^\d+[.、)]\s+(.*)$/.exec(line);
    const head = /^#{1,3}\s+(.*)$/.exec(line);
    const kind = bullet ? 'ul' : num ? 'ol' : head ? 'h' : 'p';
    const content = bullet?.[1] ?? num?.[1] ?? head?.[1] ?? line;
    const last = blocks[blocks.length - 1];
    if ((kind === 'ul' || kind === 'ol') && last && last.kind === kind) last.lines.push(content);
    else blocks.push({ kind, lines: [content] });
  }
  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === 'ul')
          return (
            <ul key={i}>
              {b.lines.map((l, j) => (
                <li key={j}>{inline(l)}</li>
              ))}
            </ul>
          );
        if (b.kind === 'ol')
          return (
            <ol key={i}>
              {b.lines.map((l, j) => (
                <li key={j}>{inline(l)}</li>
              ))}
            </ol>
          );
        if (b.kind === 'h') return <p key={i} className="chat-h">{inline(b.lines[0])}</p>;
        return <p key={i}>{inline(b.lines[0])}</p>;
      })}
    </>
  );
}

function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*|\[\d+\])/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^\[\d+\]$/.test(part)) return <sup key={i} className="chat-cite">{part}</sup>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export default function ChatMessageView({
  msg,
  thumb,
  streaming,
  isLastAssistant,
  speaking,
  copied,
  canSpeak,
  onCopy,
  onSpeak,
  onRegen,
  onDelete,
}: Props) {
  const isUser = msg.role === 'user';
  const waiting = streaming && !msg.text;

  return (
    <article className={`chat-row${isUser ? ' is-user' : ''}${msg.error ? ' is-error' : ''}`} aria-label={isUser ? '你說' : '健康小助理說'}>
      {!isUser && (
        <span className="chat-avatar" aria-hidden="true">
          <Icon name="leaf" size={16} />
        </span>
      )}
      <div className="chat-col">
        <div className="chat-bubble">
          {thumb && isUser && <img className="chat-img" src={thumb} alt="附加的圖片" />}
          {waiting ? (
            <span className="chat-typing" aria-label="正在思考">
              <span />
              <span />
              <span />
            </span>
          ) : isUser ? (
            <p className="chat-user-text">{msg.text}</p>
          ) : (
            <Rich text={msg.text} />
          )}
          {!isUser && msg.sources && msg.sources.length > 0 && (
            <div className="chat-sources" aria-label="參考來源">
              {msg.sources.map((s) => (
                <span key={s} className="chat-source">
                  <Icon name="file" size={12} /> {s}
                </span>
              ))}
            </div>
          )}
        </div>

        {!waiting && (
          <div className="chat-actions">
            <button type="button" className="chat-act" onClick={onCopy} aria-label="複製這則訊息">
              <Icon name="copy" size={14} /> {copied ? '已複製' : '複製'}
            </button>
            {!isUser && canSpeak && (
              <button type="button" className="chat-act" onClick={onSpeak} aria-pressed={speaking} aria-label={speaking ? '停止朗讀' : '朗讀這則訊息'}>
                <Icon name="speaker" size={14} /> {speaking ? '停止' : '朗讀'}
              </button>
            )}
            {!isUser && isLastAssistant && !streaming && (
              <button type="button" className="chat-act" onClick={onRegen} aria-label="重新產生回答">
                <Icon name="regen" size={14} /> 重新產生
              </button>
            )}
            <button type="button" className="chat-act" onClick={onDelete} aria-label="刪除這則訊息">
              <Icon name="trash" size={14} /> 刪除
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
