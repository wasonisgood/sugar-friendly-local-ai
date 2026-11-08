// 與 sugar-friendly-app 的 FoodAnalysisResult 保持相同欄位，方便日後共用資料

export interface NutritionalInfo {
  calories: number;
  carbs: number; // grams
  sugar: number; // grams
  protein: number; // grams
  fat: number; // grams
  fiber: number; // grams
  sodium: number; // mg
}

/** 兩種模式共用的辨識欄位 */
export interface BaseAnalysis {
  confidence: number;
  foodName: string;
  category: string;
  healthScore: number; // 0-10, 10 is most healthy overall
  nutritionalInfo: NutritionalInfo; // 每 100 公克
  recommendations: string[];
  warnings: string[];
  generalHealthAdvice: string;
  portionSizeAdvice: string;
  healthBenefits: string[];
  estimatedServingGrams?: number; // 模型估計照片中這一份的重量
}

/** 糖友模式 */
export interface FoodAnalysisResult extends BaseAnalysis {
  sugarFriendlyScore: number; // 0-10, 10 is most sugar-friendly
  diabeticAdvice: string;
}

export type GiLoad = 'low' | 'medium' | 'high';

/** 瘦瘦針飲控模式（GLP-1 類減重針劑使用者） */
export interface Glp1AnalysisResult extends BaseAnalysis {
  glp1Score: number; // 0-10 飲控友善度
  giLoad: GiLoad; // 腸胃負擔
  coachAdvice: string;
  proteinAdvice: string;
  giAdvice: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'latenight';
export type PlaceType = 'home' | 'restaurant' | 'office' | 'takeout' | 'school' | 'other';
export type Companion = 'alone' | 'family' | 'friends' | 'colleagues';
export type Symptom = 'nausea' | 'bloating' | 'reflux' | 'diarrhea' | 'constipation';

export interface MealMeta {
  eatenAt: string; // ISO
  mealType: MealType;
  placeType: PlaceType;
  placeName?: string;
  companion?: Companion;
  servingGrams?: number; // 使用者填的實際份量；沒填就用模型估計
  notes?: string;
  // 糖友模式
  bloodSugarBefore?: number; // mg/dL
  bloodSugarAfter?: number; // 餐後 2 小時 mg/dL
  // 瘦瘦針模式
  hungerBefore?: number; // 1 不餓 – 5 很餓
  ateRatio?: number; // 實際吃完的比例 0.25–1
  symptoms?: Symptom[]; // 餐後不適
}

export interface ScanHistoryItem<R extends BaseAnalysis = FoodAnalysisResult> {
  id: string;
  thumbnail: string; // small JPEG data URL
  analysisResult: R;
  timestamp: string; // 建立時間 ISO
  meta: MealMeta;
  isSample?: boolean;
}

export type Glp1Item = ScanHistoryItem<Glp1AnalysisResult>;
export type AnyItem = ScanHistoryItem<BaseAnalysis>;

/** 瘦瘦針模式的每日身體紀錄 */
export interface BodyEntry {
  date: string; // dayKey
  weightKg?: number;
  injected?: boolean;
  doseMg?: number;
  isSample?: boolean;
}
