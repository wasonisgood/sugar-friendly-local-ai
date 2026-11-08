import type { BaseAnalysis, FoodAnalysisResult, Glp1AnalysisResult } from './types';

export type Mode = 'sugar' | 'glp1';

export interface ModeProfile {
  id: Mode;
  name: string;
  sub: string;
  switchLabel: string;
  scoreLabel: string;
  /** 吉祥物與圖表用的實際色碼（與 styles.css 的變數一致） */
  colors: { ink: string; deep: string; main: string; mid: string; soft: string; tint: string; accent: string; grid: string; line: string };
}

export const MODES: Record<Mode, ModeProfile> = {
  sugar: {
    id: 'sugar',
    name: '糖友善',
    sub: '飲食紀錄',
    switchLabel: '糖友控糖',
    scoreLabel: '糖友善度',
    // Color Hunt：#84B179 #A2CB8B #C7EABB #E8F5BD
    colors: { ink: '#2F4A2A', deep: '#4F7A45', main: '#84B179', mid: '#A2CB8B', soft: '#C7EABB', tint: '#E8F5BD', accent: '#E9B949', grid: '#EDF0E4', line: '#DDE3CF' },
  },
  glp1: {
    id: 'glp1',
    name: '輕盈',
    sub: '瘦瘦針飲控',
    switchLabel: '瘦瘦針飲控',
    scoreLabel: '飲控友善度',
    // Color Hunt：#9ED2BE #7EAA92 #C8E4B2 #FFD9B7
    colors: { ink: '#22443A', deep: '#3D7560', main: '#7EAA92', mid: '#9ED2BE', soft: '#C8E4B2', tint: '#DFF2E9', accent: '#F2A96E', grid: '#E8F1EC', line: '#D4E3DA' },
  },
};

const MODE_KEY = 'sugar-friendly:mode';

/** 網址 ?mode=glp1 優先，其次是上次的選擇 */
export function loadMode(): Mode {
  const q = new URLSearchParams(location.search).get('mode');
  if (q === 'glp1' || q === 'sugar') return q;
  try {
    return localStorage.getItem(MODE_KEY) === 'glp1' ? 'glp1' : 'sugar';
  } catch {
    return 'sugar';
  }
}

export function saveMode(m: Mode) {
  try {
    localStorage.setItem(MODE_KEY, m);
  } catch {
    /* ignore */
  }
  const url = new URL(location.href);
  if (url.searchParams.has('mode')) {
    url.searchParams.delete('mode');
    history.replaceState(null, '', url);
  }
}

export const isGlp1 = (r: BaseAnalysis): r is Glp1AnalysisResult => 'glp1Score' in r;

/** 該模式的主分數 */
export const scoreOf = (r: BaseAnalysis) => (isGlp1(r) ? r.glp1Score : (r as FoodAnalysisResult).sugarFriendlyScore);

// 備註裡提到這些字，就提示可以改用瘦瘦針模式
const GLP1_HINT = /瘦瘦針|猛健樂|週纖達|胰妥讚|善纖達|減重針|GLP-?1|Ozempic|Wegovy|Mounjaro|Zepbound|Saxenda|semaglutide|tirzepatide/i;
export const mentionsGlp1 = (s?: string) => !!s && GLP1_HINT.test(s);
