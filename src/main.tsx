import '@fontsource/amiri/400.css';
import '@fontsource/amiri/700.css';
import '@fontsource-variable/readex-pro';
import './app/styles/tokens.css';
import './app/styles/app.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { SessionProvider } from './app/storage/SessionProvider';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing from index.html');

createRoot(root).render(
  <StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </StrictMode>,
);
