import type { ReactNode } from 'react';

export default function PageHead({
  eyebrow,
  title,
  children,
  aside,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="page-head-text">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {children && <p className="page-desc">{children}</p>}
      </div>
      {aside && <div className="page-head-aside">{aside}</div>}
    </header>
  );
}
