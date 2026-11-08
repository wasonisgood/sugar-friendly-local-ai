import { MODES, type Mode } from '../lib/modes';

/** 側欄的模式切換：糖友控糖／瘦瘦針飲控 */
export default function ModeSwitch({ mode, onChange, disabled }: { mode: Mode; onChange: (m: Mode) => void; disabled?: boolean }) {
  return (
    <div className="mode-switch" role="radiogroup" aria-label="使用模式" title={disabled ? '辨識或下載中，完成後才能切換' : undefined}>
      {(Object.keys(MODES) as Mode[]).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          className={`mode-opt mode-opt-${m}`}
          disabled={disabled && mode !== m}
          onClick={() => mode !== m && onChange(m)}
        >
          <i aria-hidden="true" />
          {MODES[m].switchLabel}
        </button>
      ))}
    </div>
  );
}
