import { useState } from 'react';
import type { MealMeta, ScanHistoryItem } from '../lib/types';
import MealForm from './MealForm';

export default function MetaEditor({
  item,
  knownPlaces,
  onSave,
  onCancel,
}: {
  item: ScanHistoryItem;
  knownPlaces: string[];
  onSave: (meta: MealMeta) => void;
  onCancel: () => void;
}) {
  const [meta, setMeta] = useState<MealMeta>(item.meta);
  return (
    <section className="card editor">
      <h3>修改用餐資訊</h3>
      <MealForm value={meta} onChange={setMeta} knownPlaces={knownPlaces} estimatedGrams={item.analysisResult.estimatedServingGrams} />
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={() => onSave(meta)}>
          儲存
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          取消
        </button>
      </div>
    </section>
  );
}
