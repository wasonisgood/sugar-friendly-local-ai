import { HOUR, PLACE_BY_MEAL, rng, sampleThumb } from './sample';
import type { GiLoad, Glp1AnalysisResult, Glp1Item, MealType, Symptom } from './types';

const BG = '#DFF2E9';
const RING = '#9ED2BE';
export const glp1Thumb = (category: string) => sampleThumb(category, BG, RING);

// 瀏覽器不支援本地模型時的範例結果
export const GLP1_SAMPLE_RESULT: Glp1AnalysisResult = {
  confidence: 0.86,
  foodName: '舒肥雞胸、溫泉蛋、燙青菜',
  category: '蛋白質',
  glp1Score: 9,
  healthScore: 9,
  giLoad: 'low',
  nutritionalInfo: { calories: 105, carbs: 3, sugar: 1.2, protein: 17, fat: 3, fiber: 1.8, sodium: 260 },
  recommendations: ['先吃雞胸與蛋，再吃青菜，蛋白質比較不會吃不完', '吃不下時留下青菜，不要留下蛋白質', '可另外喝一杯無糖豆漿補蛋白質'],
  warnings: ['份量對目前的食量可能偏多，飽了就停'],
  coachAdvice: '這一餐低油、高蛋白，很適合打針後食量變小的時候。慢慢吃，感覺七分飽就可以停，剩下的留到下一餐。',
  proteinAdvice: '整份約有 34 公克蛋白質，已達每餐目標；就算只吃完一半也有 17 公克，可以用一顆茶葉蛋補足。',
  giAdvice: '溫泉蛋與雞胸不油膩，腸胃負擔低。每口嚼久一點、吃到一半停兩分鐘，比較不容易噁心。',
  generalHealthAdvice: '高蛋白、低脂、有蔬菜，是均衡又容易準備的一餐。',
  portionSizeAdvice: '雞胸約一個手掌、青菜一個拳頭；食量小時先吃半份',
  healthBenefits: ['蛋白質充足，減重期間有助保留肌肉', '低油低糖，飯後血糖與腸胃都穩定', '青菜提供纖維，減少便秘'],
  estimatedServingGrams: 200,
};
export const GLP1_SAMPLE_THUMB = glp1Thumb(GLP1_SAMPLE_RESULT.category);

type Food = [name: string, category: string, score: number, health: number, gi: GiLoad, grams: number, kcal: number, carbs: number, sugar: number, protein: number, fat: number, fiber: number, sodium: number];

// 每 100 公克的大致數值
const FOODS: Record<MealType, Food[]> = {
  breakfast: [
    ['無糖豆漿與水煮蛋', '蛋白質', 9, 8, 'low', 300, 55, 2, 0.8, 5.5, 2.6, 0.6, 40],
    ['希臘優格莓果', '蛋白質', 9, 9, 'low', 200, 80, 8, 6, 8, 2, 1.5, 40],
    ['鮪魚蛋三明治', '混合餐', 7, 7, 'medium', 180, 210, 22, 3.5, 12, 8, 2.5, 420],
    ['燒餅油條加豆漿', '混合餐', 3, 3, 'high', 350, 190, 21, 4, 6, 9.5, 0.8, 330],
    ['燕麥高蛋白飲', '主食', 8, 8, 'low', 300, 70, 8, 3, 7, 1.5, 1.6, 60],
  ],
  lunch: [
    ['烤雞胸便當（飯減半）', '混合餐', 8, 8, 'low', 450, 120, 12, 1, 11, 3, 1.8, 300],
    ['鮭魚味噌湯定食', '混合餐', 8, 8, 'low', 450, 110, 10, 1.2, 9, 4, 1.4, 380],
    ['排骨便當', '混合餐', 4, 5, 'high', 550, 175, 20, 2, 8, 7.5, 1.2, 400],
    ['牛肉麵', '主食', 4, 5, 'medium', 650, 95, 12, 1, 5.5, 3, 0.6, 420],
    ['超商雞胸沙拉', '蔬菜', 9, 9, 'low', 280, 75, 4, 2, 10, 2, 2.2, 260],
    ['自助餐三菜一肉', '混合餐', 7, 7, 'medium', 420, 130, 12, 2, 8, 5.5, 2.2, 330],
  ],
  dinner: [
    ['豆腐蒸魚配青菜', '蛋白質', 9, 9, 'low', 400, 85, 3, 1, 11, 3, 1.6, 260],
    ['涮涮鍋（清湯）', '混合餐', 8, 8, 'low', 600, 65, 3, 1.2, 8, 2.5, 1.8, 420],
    ['炸雞', '蛋白質', 2, 3, 'high', 250, 290, 12, 0.3, 17, 19, 0.8, 600],
    ['滷味（豆干、海帶、蛋）', '混合餐', 7, 6, 'medium', 300, 110, 6, 1.5, 10, 5, 2, 650],
    ['奶油白醬義大利麵', '主食', 2, 3, 'high', 380, 190, 22, 2.5, 6, 9, 1.2, 420],
  ],
  snack: [
    ['茶葉蛋', '蛋白質', 9, 8, 'low', 60, 140, 1.5, 1, 12, 9, 0, 480],
    ['無糖優格', '蛋白質', 9, 8, 'low', 150, 60, 4.5, 4, 5, 3, 0, 45],
    ['珍珠奶茶', '飲料', 1, 2, 'high', 700, 70, 13, 10, 0.5, 2, 0, 20],
    ['芭樂', '水果', 8, 9, 'low', 200, 40, 9, 5, 0.8, 0.2, 3, 3],
    ['氣泡飲', '飲料', 3, 3, 'high', 330, 40, 10, 10, 0, 0, 0, 10],
  ],
  latenight: [
    ['鹹酥雞', '蛋白質', 2, 3, 'high', 250, 280, 15, 0.5, 15, 18, 1, 650],
    ['高蛋白飲', '飲料', 8, 7, 'low', 300, 45, 3, 1, 7, 0.8, 0.5, 70],
  ],
};

/** 示範：打針後一兩天食量最小、油膩餐容易不舒服 */
export function buildGlp1SampleRecords(days = 28): Glp1Item[] {
  const rand = rng(20261030);
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  const out: Glp1Item[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let d = days - 1; d >= 0; d--) {
    const sinceShot = (3 - (d % 7) + 7) % 7; // 與 body.ts 的示範打針日一致
    const meals: MealType[] = ['breakfast', 'lunch', 'dinner'];
    if (rand() < (sinceShot <= 1 ? 0.2 : 0.5)) meals.push('snack');
    if (rand() < 0.1) meals.push('latenight');
    for (const mt of meals) {
      if (rand() < (sinceShot <= 1 ? 0.2 : 0.06)) continue; // 打針後常常跳過一餐
      const [name, category, score, health, gi, grams, kcal, carbs, sugar, protein, fat, fiber, sodium] = pick(FOODS[mt]);
      const [h0, h1] = HOUR[mt];
      const at = new Date(today);
      at.setDate(at.getDate() - d);
      at.setHours(h0 + Math.floor(rand() * (h1 - h0 + 1)), Math.floor(rand() * 60));
      if (at > new Date()) continue;
      const [placeType, placeName] = pick(PLACE_BY_MEAL[mt]);
      // 食慾在打針後兩天最低，之後慢慢回來
      const appetite = Math.min(1, 0.45 + sinceShot * 0.12 + rand() * 0.15);
      const ateRatio = appetite > 0.9 ? 1 : appetite > 0.68 ? 0.75 : appetite > 0.45 ? 0.5 : 0.25;
      const risk = (gi === 'high' ? 0.55 : gi === 'medium' ? 0.2 : 0.05) * (sinceShot <= 2 ? 1.5 : 0.8);
      const symptoms: Symptom[] = rand() < risk ? [pick<Symptom>(gi === 'high' ? ['nausea', 'bloating', 'reflux'] : ['bloating', 'constipation', 'nausea'])] : [];
      out.push({
        id: `glp1-sample-${d}-${mt}`,
        thumbnail: glp1Thumb(category),
        isSample: true,
        timestamp: at.toISOString(),
        meta: {
          eatenAt: at.toISOString(),
          mealType: mt,
          placeType,
          placeName,
          companion: pick(['alone', 'family', 'colleagues', 'friends'] as const),
          servingGrams: Math.round(grams * (0.85 + rand() * 0.3)),
          hungerBefore: Math.max(1, Math.min(5, Math.round(1 + sinceShot * 0.6 + rand() * 1.5))),
          ateRatio,
          symptoms: symptoms.length ? symptoms : undefined,
        },
        analysisResult: {
          confidence: 0.7 + rand() * 0.25,
          foodName: name,
          category,
          glp1Score: score,
          healthScore: health,
          giLoad: gi,
          nutritionalInfo: { calories: kcal, carbs, sugar, protein, fat, fiber, sodium },
          recommendations: [],
          warnings: [],
          coachAdvice: '',
          proteinAdvice: '',
          giAdvice: '',
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
