import type { FoodAnalysisResult, MealType, PlaceType, ScanHistoryItem } from './types';

// 瀏覽器不支援本地模型時，用來預覽版面的範例（取自原 App 的 mock 資料）
export const SAMPLE_RESULT: FoodAnalysisResult = {
  confidence: 0.89,
  foodName: '蒸蛋豆腐',
  category: '蛋白質',
  sugarFriendlyScore: 9,
  healthScore: 8,
  nutritionalInfo: { calories: 95, carbs: 5, sugar: 2, protein: 12, fat: 4, fiber: 2, sodium: 300 },
  recommendations: ['優質蛋白質來源，適合糖尿病患者', '可以增加蔬菜配菜', '注意調味料的使用'],
  warnings: ['注意醬油等調味料的鈉含量'],
  diabeticAdvice:
    '豆腐是優質的植物蛋白質，對血糖影響小，非常適合糖尿病患者。蒸蛋提供優質動物蛋白，兩者搭配營養均衡。',
  generalHealthAdvice: '低熱量高營養，適合各年齡層。蒸蛋易消化，適合長輩與小孩。',
  portionSizeAdvice: '一份約 150–200 克，大約一個手掌大小',
  healthBenefits: ['提供完整胺基酸，支持肌肉合成', '富含鈣質，有助骨骼健康', '低熱量高蛋白，適合體重管理'],
  estimatedServingGrams: 180,
};

const CATEGORY_COLOR: Record<string, string> = {
  主食: '#F3E2B8',
  蛋白質: '#F2D98B',
  蔬菜: '#A9D18E',
  水果: '#F4A582',
  飲料: '#C9A27A',
  甜點: '#F6C1CF',
  混合餐: '#E7C59A',
};

export function sampleThumb(category: string): string {
  const fill = CATEGORY_COLOR[category] ?? '#E7C59A';
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240"><rect width="320" height="240" fill="#E8F5BD"/><ellipse cx="160" cy="128" rx="112" ry="74" fill="#FFFFFF" stroke="#C7EABB" stroke-width="3"/><ellipse cx="160" cy="124" rx="74" ry="44" fill="${fill}"/></svg>`,
    )
  );
}

export const SAMPLE_THUMB = sampleThumb(SAMPLE_RESULT.category);

// ---------- 示範紀錄（圖表預覽用） ----------

type Food = [name: string, category: string, score: number, health: number, grams: number, kcal: number, carbs: number, sugar: number, protein: number, fat: number, fiber: number, sodium: number];

// 每 100 公克的大致數值
const FOODS: Record<MealType, Food[]> = {
  breakfast: [
    ['蛋餅加無糖豆漿', '混合餐', 6, 6, 350, 120, 14, 2, 5.5, 4.5, 0.8, 210],
    ['燕麥牛奶', '主食', 7, 8, 300, 75, 11, 4, 3.5, 2, 1.5, 45],
    ['全麥三明治', '混合餐', 7, 7, 180, 220, 26, 4, 10, 8, 3.5, 420],
    ['蘿蔔糕加奶茶', '混合餐', 3, 4, 400, 110, 18, 7, 1.5, 3.5, 0.5, 190],
    ['地瓜與水煮蛋', '主食', 8, 8, 200, 105, 18, 5, 5, 2.5, 2.5, 60],
  ],
  lunch: [
    ['雞腿便當', '混合餐', 5, 6, 550, 160, 20, 1.5, 9, 5, 1.2, 380],
    ['牛肉麵', '主食', 4, 5, 650, 95, 12, 1, 5.5, 3, 0.6, 420],
    ['燙青菜滷肉飯', '混合餐', 4, 5, 400, 175, 24, 2, 6, 6, 1.5, 350],
    ['鮭魚沙拉', '蔬菜', 9, 9, 300, 115, 5, 2.5, 10, 6.5, 2.5, 230],
    ['自助餐三菜一肉', '混合餐', 7, 7, 450, 130, 13, 2, 7.5, 5.5, 2.2, 330],
    ['水餃十顆', '主食', 5, 5, 300, 210, 25, 1.2, 8, 8.5, 1.3, 460],
  ],
  dinner: [
    ['糙米飯清蒸魚', '混合餐', 8, 9, 450, 120, 15, 1, 9, 3, 2, 200],
    ['火鍋（不含飯麵）', '混合餐', 8, 7, 700, 70, 4, 1.5, 7, 3, 1.8, 480],
    ['炒飯', '主食', 3, 4, 400, 185, 26, 1.5, 5, 7, 0.8, 470],
    ['豆腐蔬菜湯配五穀飯', '混合餐', 9, 9, 500, 85, 11, 1.5, 4.5, 2.5, 2.5, 240],
    ['義大利麵', '主食', 4, 5, 380, 160, 24, 3, 6, 4.5, 1.6, 380],
  ],
  snack: [
    ['珍珠奶茶', '飲料', 1, 2, 700, 70, 13, 10, 0.5, 2, 0, 20],
    ['芭樂', '水果', 9, 9, 200, 40, 9, 5, 0.8, 0.2, 3, 3],
    ['原味堅果', '蛋白質', 8, 8, 30, 600, 18, 4, 18, 52, 7, 5],
    ['蛋糕', '甜點', 2, 3, 120, 360, 50, 32, 5, 16, 0.6, 250],
    ['無糖優格', '蛋白質', 9, 8, 150, 60, 4.5, 4, 5, 3, 0, 45],
  ],
  latenight: [
    ['鹹酥雞', '蛋白質', 3, 3, 250, 280, 15, 0.5, 15, 18, 1, 650],
    ['泡麵', '主食', 2, 2, 350, 140, 19, 1, 3, 5.5, 0.8, 560],
    ['茶葉蛋', '蛋白質', 9, 7, 60, 140, 1.5, 1, 12, 9, 0, 480],
  ],
};

const PLACE_BY_MEAL: Record<MealType, [PlaceType, string?][]> = {
  breakfast: [['home'], ['takeout', '巷口早餐店'], ['office']],
  lunch: [['restaurant', '公司附近自助餐'], ['office'], ['takeout', '便當店'], ['restaurant', '麵店']],
  dinner: [['home'], ['restaurant', '火鍋店'], ['takeout']],
  snack: [['office'], ['takeout', '手搖飲'], ['home']],
  latenight: [['home'], ['takeout', '夜市']],
};

const HOUR: Record<MealType, [number, number]> = {
  breakfast: [7, 9],
  lunch: [12, 13],
  dinner: [18, 20],
  snack: [15, 16],
  latenight: [22, 23],
};

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export function buildSampleRecords(days = 28): ScanHistoryItem[] {
  const rand = rng(20261029);
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  const out: ScanHistoryItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let d = days - 1; d >= 0; d--) {
    const meals: MealType[] = ['breakfast', 'lunch', 'dinner'];
    if (rand() < 0.45) meals.push('snack');
    if (rand() < 0.15) meals.push('latenight');
    for (const mt of meals) {
      if (rand() < 0.08) continue; // 偶爾忘了記
      const [name, category, score, health, grams, kcal, carbs, sugar, protein, fat, fiber, sodium] = pick(FOODS[mt]);
      const [h0, h1] = HOUR[mt];
      const at = new Date(today);
      at.setDate(at.getDate() - d);
      at.setHours(h0 + Math.floor(rand() * (h1 - h0 + 1)), Math.floor(rand() * 60));
      if (at > new Date()) continue;
      const [placeType, placeName] = pick(PLACE_BY_MEAL[mt]);
      const g = Math.round(grams * (0.8 + rand() * 0.4));
      const carbIntake = (carbs * g) / 100;
      const hasBg = mt !== 'snack' && rand() < 0.55;
      const before = Math.round(95 + rand() * 35);
      out.push({
        id: `sample-${d}-${mt}`,
        thumbnail: sampleThumb(category),
        isSample: true,
        timestamp: at.toISOString(),
        meta: {
          eatenAt: at.toISOString(),
          mealType: mt,
          placeType,
          placeName,
          companion: pick(['alone', 'family', 'colleagues', 'friends'] as const),
          servingGrams: g,
          bloodSugarBefore: hasBg ? before : undefined,
          // 粗略模擬：碳水越多、分數越低，餐後上升越多
          bloodSugarAfter: hasBg ? Math.round(before + carbIntake * 0.9 + (10 - score) * 4 + rand() * 20) : undefined,
        },
        analysisResult: {
          confidence: 0.7 + rand() * 0.25,
          foodName: name,
          category,
          sugarFriendlyScore: score,
          healthScore: health,
          nutritionalInfo: { calories: kcal, carbs, sugar, protein, fat, fiber, sodium },
          recommendations: [],
          warnings: [],
          diabeticAdvice: '',
          generalHealthAdvice: '',
          portionSizeAdvice: '',
          healthBenefits: [],
          estimatedServingGrams: grams,
        },
      });
    }
  }
  return out;
}
