import { useState } from 'react';
import type { Mode } from '../lib/modes';
import type { AnyItem, MealMeta } from '../lib/types';
import MealForm from './MealForm';

export default function MetaEditor({
  mode,
  item,
  knownPlaces,
  onSave,
  onCancel,
}: {
  mode: Mode;
  item: AnyItem;
  knownPlaces: string[];
  onSave: (meta: MealMeta) => void;
  onCancel: () => void;
}) {
  const [meta, setMeta] = useState<MealMeta>(item.meta);
  return (
    <section className="editor">
      <h2 className="side-title">修改用餐資訊</h2>
      <MealForm mode={mode} value={meta} onChange={setMeta} knownPlaces={knownPlaces} estimatedGrams={item.analysisResult.estimatedServingGrams} idPrefix="edit" />
      <div className="action-bar">
        <button type="button" className="btn btn-primary" onClick={() => onSave(meta)}>
          儲存
        </button>
        <button type="button" className="btn btn-quiet" onClick={onCancel}>
          取消
        </button>
      </div>
    </section>
  );
}
