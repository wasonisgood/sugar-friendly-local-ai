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

export interface FoodAnalysisResult {
  confidence: number;
  foodName: string;
  category: string;
  sugarFriendlyScore: number; // 0-10, 10 is most sugar-friendly
  healthScore: number; // 0-10, 10 is most healthy overall
  nutritionalInfo: NutritionalInfo; // 每 100 公克
  recommendations: string[];
  warnings: string[];
  diabeticAdvice: string;
  generalHealthAdvice: string;
  portionSizeAdvice: string;
  healthBenefits: string[];
  estimatedServingGrams?: number; // 模型估計照片中這一份的重量
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'latenight';
export type PlaceType = 'home' | 'restaurant' | 'office' | 'takeout' | 'school' | 'other';
export type Companion = 'alone' | 'family' | 'friends' | 'colleagues';

export interface MealMeta {
  eatenAt: string; // ISO
  mealType: MealType;
  placeType: PlaceType;
  placeName?: string;
  companion?: Companion;
  servingGrams?: number; // 使用者填的實際份量；沒填就用模型估計
  bloodSugarBefore?: number; // mg/dL
  bloodSugarAfter?: number; // 餐後 2 小時 mg/dL
  notes?: string;
}

export interface ScanHistoryItem {
  id: string;
  thumbnail: string; // small JPEG data URL
  analysisResult: FoodAnalysisResult;
  timestamp: string; // 建立時間 ISO
  meta: MealMeta;
  isSample?: boolean;
}
