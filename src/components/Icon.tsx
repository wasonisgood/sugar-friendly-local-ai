// 線條圖示，風格對齊原 App 使用的 Ionicons outline
const PATHS = {
  leaf: 'M5 19c0-8 5-13 14-14-1 9-6 14-14 14zm0 0 7-7',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.01',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  pin: 'M12 21s-6-5.5-6-11a6 6 0 1 1 12 0c0 5.5-6 11-6 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  people: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 0 1 0 6M18 14c2 .5 3 2.5 3 5',
  drop: 'M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z',
  scale: 'M5 20h14l-2-11H7zM9 9a3 3 0 0 1 6 0',
  note: 'M5 4h14v16H5zM8 9h8M8 13h8M8 17h5',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  clipboard: 'M9 4h6v3H9zM7 5H5v16h14V5h-2',
  image: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9.5v.01',
  close: 'M6 6l12 12M18 6 6 18',
  back: 'M15 5l-7 7 7 7',
  check: 'M5 12l5 5 9-10',
  warn: 'M12 4 3 20h18zM12 10v4M12 17v.01',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  switch: 'M5 10a7 7 0 0 1 12.5-3.5L19 8M19 4v4h-4M19 14a7 7 0 0 1-12.5 3.5L5 16M5 20v-4h4',
  upload: 'M12 16V5M7 10l5-5 5 5M5 19h14',
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
