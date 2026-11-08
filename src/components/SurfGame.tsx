import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { MODES, type Mode } from '../lib/modes';

// 等待 AI 辨識時的小遊戲：在浪上衝浪，撿健康食物、避開高糖與油炸食物。
const W = 600;
const H = 200;
const BASE = 150; // 浪的基準高度（畫布座標）
const PX = 96; // 衝浪者的水平位置
const ROUND_MS = 75000; // 一局約 75 秒，涵蓋大多數辨識等待時間
const LIVES = 3;
const GRAV = 0.0028; // px/ms²
const JUMP = 0.67; // px/ms，跳到約 80px 高

const COPY: Record<
  Mode,
  { good: string[]; bad: string[]; goodLabel: string; badLabel: string; tips: string[]; endLine: string; title: string }
> = {
  sugar: {
    good: ['🥦', '🥚', '🐟', '🥗'],
    bad: ['🧋', '🍩', '🍬', '🍰'],
    goodLabel: '蔬菜、蛋白質',
    badLabel: '含糖飲料與甜點',
    title: '糖友衝浪',
    tips: [
      '先吃蔬菜和蛋白質，再吃澱粉，血糖通常會比較平穩。',
      '含糖飲料和甜點最容易讓血糖快速上升，無糖茶或白開水是更好的選擇。',
      '餐後動一動，例如散步 10 到 15 分鐘，對不少人有幫助。',
      '記得量血糖，數字會告訴你哪些食物對你比較友善。',
      '每一餐都是一次選擇，你已經在為自己的血糖努力了。',
    ],
    endLine: '這一局的每個選擇，都是為你的血糖著想。照片辨識完成後，結果會幫你看清這一餐。',
  },
  glp1: {
    good: ['🥚', '🍗', '🐟', '🥛'],
    bad: ['🍕', '🍟', '🥤', '🍔'],
    goodLabel: '蛋白質',
    badLabel: '油炸與大份量',
    title: '輕盈衝浪',
    tips: [
      '慢慢吃，吃到七八分飽就停下來，讓身體有時間發出飽足訊號。',
      '蛋白質優先，有助於保留肌肉量，體重下降時尤其重要。',
      '吃得少也要記得補水，若頭暈或特別疲倦，請諮詢醫師。',
      '油炸和高糖食物容易引起腸胃不適，可以試著換成清淡的選擇。',
      '每天的紀錄都是很好的回饋，看見趨勢比單一數字更有用。',
    ],
    endLine: '這一局的每個選擇，都是為了讓身體舒服地走下去。結果出來後，也會一起看看這一餐的蛋白質與份量。',
  },
};

export default function SurfGame({ mode }: { mode: Mode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const jumpRef = useRef<() => void>(() => {});
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [left, setLeft] = useState(ROUND_MS);
  const [over, setOver] = useState(false);
  const [tip, setTip] = useState(0);
  const [run, setRun] = useState(0);
  const c = COPY[mode];

  // 每 6 秒換一則小提醒
  useEffect(() => {
    const t = window.setInterval(() => setTip((i) => i + 1), 6000);
    return () => window.clearInterval(t);
  }, []);

  // 遊戲主迴圈
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const colors = MODES[mode].colors;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    type Item = { x: number; lane: 'ground' | 'high'; emoji: string; good: boolean; taken: boolean };
    type Fx = { x: number; y: number; text: string; life: number };
    let items: Item[] = [];
    let fx: Fx[] = [];
    let py = 0; // 衝浪者離浪面的高度
    let vy = 0;
    let t = 0;
    let wave = 0;
    let nextSpawn = 900;
    let invul = 0;
    let s = 0;
    let hp = LIVES;
    let uiTimer = 0;
    let stopped = false;
    let raf = 0;
    let last = performance.now();

    const speed = () => 0.18 + 0.08 * Math.min(1, t / ROUND_MS); // px/ms
    const waveY = (x: number) => BASE + 8 * Math.sin((x + wave) / 40);
    const laneY = (it: Item) => (it.lane === 'ground' ? waveY(it.x) - 14 : waveY(it.x) - 75);
    const playerY = () => waveY(PX) - py - 14;

    const jump = () => {
      if (!stopped && py === 0) vy = JUMP;
    };
    jumpRef.current = jump;

    const finish = () => {
      stopped = true;
      setScore(s);
      setLives(hp);
      setLeft(0);
      setOver(true);
    };

    const update = (dt: number) => {
      t += dt;
      wave += speed() * dt;

      // 跳躍物理
      vy -= GRAV * dt;
      py = Math.max(0, py + vy * dt);
      if (py === 0) vy = 0;

      // 物件往左移動，並生成新的
      for (const it of items) it.x -= speed() * dt;
      items = items.filter((it) => it.x > -30 && !it.taken);
      nextSpawn -= dt;
      if (nextSpawn <= 0) {
        const good = Math.random() < 0.6;
        const pool = good ? c.good : c.bad;
        const lane: Item['lane'] = good && Math.random() < 0.5 ? 'high' : 'ground';
        items.push({ x: W + 20, lane, emoji: pool[Math.floor(Math.random() * pool.length)], good, taken: false });
        nextSpawn = 800 + Math.random() * 700;
      }

      // 碰撞
      invul = Math.max(0, invul - dt);
      const pcy = playerY();
      for (const it of items) {
        if (it.taken) continue;
        if (Math.abs(it.x - PX) < 24 && Math.abs(laneY(it) - pcy) < 24) {
          it.taken = true;
          if (it.good) {
            s += 10;
            fx.push({ x: it.x, y: laneY(it), text: '+10', life: 700 });
          } else if (invul <= 0) {
            hp -= 1;
            invul = 900;
            fx.push({ x: PX, y: pcy - 26, text: '-1 ❤', life: 900 });
          }
        }
      }
      fx = fx.map((f) => ({ ...f, y: f.y - 0.03 * dt, life: f.life - dt })).filter((f) => f.life > 0);

      // 狀態同步到畫面（節流）
      uiTimer += dt;
      if (uiTimer >= 200 || hp <= 0 || t >= ROUND_MS) {
        uiTimer = 0;
        setScore(s);
        setLives(hp);
        setLeft(Math.max(0, ROUND_MS - t));
      }

      if (hp <= 0 || t >= ROUND_MS) finish();
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, colors.tint);
      sky.addColorStop(1, '#ffffff');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // 浪
      const wavePath = (offset: number) => {
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 8) ctx.lineTo(x, waveY(x) + offset);
        ctx.lineTo(W, H);
        ctx.closePath();
      };
      wavePath(0);
      ctx.fillStyle = colors.soft;
      ctx.fill();
      wavePath(14);
      ctx.fillStyle = colors.mid;
      ctx.fill();

      // 時間條
      ctx.fillStyle = colors.main;
      ctx.fillRect(0, 0, W * (Math.max(0, ROUND_MS - t) / ROUND_MS), 4);

      // 物件
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '26px sans-serif';
      for (const it of items) ctx.fillText(it.emoji, it.x, laneY(it));

      // 衝浪者（受傷時閃爍）
      if (!(invul > 0 && Math.floor(t / 100) % 2 === 0)) {
        ctx.font = '34px sans-serif';
        ctx.fillText('🏄', PX, playerY());
      }

      // 提示文字
      for (const f of fx) {
        ctx.globalAlpha = Math.max(0, Math.min(1, f.life / 400));
        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = f.text.startsWith('+') ? colors.deep : '#B5452B';
        ctx.fillText(f.text, f.x, f.y);
        ctx.globalAlpha = 1;
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      if (!stopped) update(dt);
      draw();
      if (!stopped) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      jumpRef.current = () => {};
    };
    // 只在模式或再玩一局時重新開始
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, run]);

  const restart = () => {
    setScore(0);
    setLives(LIVES);
    setLeft(ROUND_MS);
    setOver(false);
    setRun((r) => r + 1);
  };

  const onKey = (e: KeyboardEvent) => {
    if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key)) {
      e.preventDefault();
      jumpRef.current();
    }
  };

  return (
    <div className="surf" tabIndex={0} onKeyDown={onKey} aria-label={`${c.title}小遊戲，等待辨識時可以玩`}>
      <div className="surf-top">
        <span className="surf-title">{c.title}</span>
        <span>
          剩 <b className="num">{Math.ceil(left / 1000)}</b> 秒
        </span>
        <span>
          分數 <b className="num">{score}</b>
        </span>
        <span className="surf-hp" aria-label={`剩 ${lives} 次機會`}>
          {'❤'.repeat(Math.max(0, lives))}
        </span>
      </div>
      <div className="surf-stage" onPointerDown={() => jumpRef.current()}>
        <canvas ref={canvasRef} className="surf-canvas" style={{ width: '100%', height: 'auto' }} />
        {over && (
          <div className="surf-over">
            <b>這一局結束了，分數 {score}</b>
            <p>{c.endLine}</p>
            <button type="button" className="link-btn" onClick={restart}>
              再玩一局
            </button>
          </div>
        )}
      </div>
      <p className="surf-tip">{c.tips[tip % c.tips.length]}</p>
      <p className="surf-hint">空白鍵或點一下跳起。撿到{c.goodLabel}加分，避開{c.badLabel}。</p>
    </div>
  );
}
