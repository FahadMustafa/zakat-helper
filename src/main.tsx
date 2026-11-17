import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing from index.html');

createRoot(root).render(
  <StrictMode>
    <main>
      <h1>Zakat Helper</h1>
      <p>Work out your zakat privately. Your data never leaves this device.</p>
    </main>
  </StrictMode>,
);
