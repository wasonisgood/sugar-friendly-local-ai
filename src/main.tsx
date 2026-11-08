import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { loadMode } from './lib/modes';
import './styles.css';
import './loading.css';
import './chat.css';

// 先套上色票再渲染，避免切換模式後重新整理時閃一下
document.documentElement.dataset.mode = loadMode();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
