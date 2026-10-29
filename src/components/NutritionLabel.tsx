import type { NutritionalInfo } from '../lib/types';

const ROWS: { key: keyof NutritionalInfo; label: string; unit: string; indent?: boolean }[] = [
  { key: 'calories', label: '熱量', unit: '大卡' },
  { key: 'protein', label: '蛋白質', unit: '公克' },
  { key: 'fat', label: '脂肪', unit: '公克' },
  { key: 'carbs', label: '碳水化合物', unit: '公克' },
  { key: 'sugar', label: '糖', unit: '公克', indent: true },
  { key: 'fiber', label: '膳食纖維', unit: '公克', indent: true },
  { key: 'sodium', label: '鈉', unit: '毫克' },
];

const fmt = (n: number) => (n >= 100 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString());

export default function NutritionLabel({ info }: { info: NutritionalInfo }) {
  return (
    <table className="nlabel">
      <caption>
        營養標示 <span>估算值</span>
      </caption>
      <thead>
        <tr>
          <th scope="col"></th>
          <th scope="col">每 100 公克</th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map((r) => (
          <tr key={r.key} className={r.indent ? 'is-sub' : undefined}>
            <th scope="row">{r.label}</th>
            <td>
              {fmt(info[r.key])} <small>{r.unit}</small>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
