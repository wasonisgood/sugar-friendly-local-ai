// 小葉子：等待時的吉祥物。scan＝拿放大鏡看照片，download＝等飯碗裝滿
export default function Mascot({ mode, fill = 0 }: { mode: 'scan' | 'download'; fill?: number }) {
  const level = Math.max(0, Math.min(1, fill));
  return (
    <svg className={`mascot mascot-${mode}`} viewBox="0 0 180 130" aria-hidden="true">
      <ellipse className="mascot-shadow" cx="62" cy="118" rx="30" ry="5" />

      <g className="mascot-bob">
        {/* 頭上的芽 */}
        <g className="mascot-sprout">
          <path d="M62 44 C62 36 62 30 63 24" style={{ stroke: 'var(--leaf-700)' }} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M63 28 C54 22 46 24 44 30 C52 34 59 33 63 28Z" style={{ fill: 'var(--leaf-500)' }} />
          <path d="M63 26 C70 16 80 16 84 21 C77 29 69 30 63 26Z" style={{ fill: 'var(--leaf-400)' }} />
        </g>
        {/* 身體 */}
        <ellipse cx="62" cy="80" rx="36" ry="34" style={{ fill: 'var(--leaf-400)' }} />
        <ellipse cx="62" cy="88" rx="24" ry="20" style={{ fill: 'var(--leaf-200)' }} />
        {/* 臉 */}
        <g className="mascot-eyes">
          <ellipse className="mascot-eye" cx="50" cy="72" rx="4" ry="5" style={{ fill: 'var(--leaf-900)' }} />
          <ellipse className="mascot-eye" cx="74" cy="72" rx="4" ry="5" style={{ fill: 'var(--leaf-900)' }} />
          <circle cx="51.5" cy="70" r="1.4" fill="#fff" />
          <circle cx="75.5" cy="70" r="1.4" fill="#fff" />
        </g>
        <circle cx="42" cy="82" r="5" fill="#F4B6A6" opacity="0.8" />
        <circle cx="82" cy="82" r="5" fill="#F4B6A6" opacity="0.8" />
        <path d="M56 84 Q62 89 68 84" style={{ stroke: 'var(--leaf-900)' }} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        {/* 小手 */}
        <path className="mascot-arm" d="M94 84 Q104 80 108 72" style={{ stroke: 'var(--leaf-500)' }} strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>

      {mode === 'scan' && (
        <g className="mascot-glass">
          <line x1="112" y1="78" x2="102" y2="92" stroke="#8D9488" strokeWidth="6" strokeLinecap="round" />
          <circle cx="124" cy="62" r="18" style={{ fill: 'var(--lime-100)', stroke: 'var(--leaf-700)' }} fillOpacity="0.55" strokeWidth="5" />
          <path d="M114 56 Q118 50 124 49" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}

      {mode === 'download' && (
        <g className="mascot-bowl">
          <g className="mascot-steam">
            <path d="M132 50 q-5 -7 0 -14 q5 -7 0 -14" />
            <path d="M146 50 q-5 -7 0 -14 q5 -7 0 -14" />
            <path d="M160 50 q-5 -7 0 -14 q5 -7 0 -14" />
          </g>
          <clipPath id="bowl-clip">
            <path d="M118 64 H174 C174 88 162 104 146 104 C130 104 118 88 118 64Z" />
          </clipPath>
          <g clipPath="url(#bowl-clip)">
            <rect x="116" y="60" width="60" height="46" fill="#FFFFFF" />
            <rect className="mascot-rice" x="116" y={104 - 44 * level} width="60" height={44 * level + 2} fill="#FBF6E6" />
            <ellipse cx="146" cy={104 - 44 * level} rx="30" ry="4" fill="#F3EBD0" opacity={level > 0.02 ? 1 : 0} />
          </g>
          <path d="M118 64 H174 C174 88 162 104 146 104 C130 104 118 88 118 64Z" fill="none" style={{ stroke: 'var(--leaf-700)' }} strokeWidth="4" strokeLinejoin="round" />
          <path d="M136 106 h20" style={{ stroke: 'var(--leaf-700)' }} strokeWidth="4" strokeLinecap="round" />
          <path d="M126 74 h40" stroke="#E07A5F" strokeWidth="3" strokeDasharray="2 6" strokeLinecap="round" opacity="0.6" />
        </g>
      )}
    </svg>
  );
}
