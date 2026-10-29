import type { FoodAnalysisResult } from './types';

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
  generalHealthAdvice:
    '低熱量高營養，適合各年齡層。蒸蛋易消化，適合長輩與小孩。',
  portionSizeAdvice: '一份約 150–200 克，大約一個手掌大小',
  healthBenefits: ['提供完整胺基酸，支持肌肉合成', '富含鈣質，有助骨骼健康', '低熱量高蛋白，適合體重管理'],
};

export const SAMPLE_THUMB =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240"><rect width="320" height="240" fill="#e9dfcc"/><ellipse cx="160" cy="130" rx="110" ry="70" fill="#fbf7ef" stroke="#c9bba1" stroke-width="3"/><ellipse cx="160" cy="125" rx="70" ry="40" fill="#f2d98b"/><rect x="128" y="108" width="28" height="24" rx="3" fill="#fbf4e2"/><rect x="164" y="114" width="26" height="22" rx="3" fill="#fbf4e2"/><circle cx="145" cy="140" r="4" fill="#5d8a4a"/><circle cx="182" cy="104" r="3" fill="#5d8a4a"/></svg>`,
  );
