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
  nutritionalInfo: NutritionalInfo;
  recommendations: string[];
  warnings: string[];
  diabeticAdvice: string;
  generalHealthAdvice: string;
  portionSizeAdvice: string;
  healthBenefits: string[];
}

export interface ScanHistoryItem {
  id: string;
  thumbnail: string; // small JPEG data URL
  analysisResult: FoodAnalysisResult;
  timestamp: string; // ISO
  notes?: string;
  isSample?: boolean;
}
