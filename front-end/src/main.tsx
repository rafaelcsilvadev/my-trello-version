import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';

import { App } from '@/app/app';
import { createAppServices } from '@/app/app-services';
import { createSafeStorage } from '@/shared/storage/safe-storage';

import '@/styles/app.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing #root element');
}

const services = createAppServices({
  storage: createSafeStorage(),
  createRouter: (routes) => createBrowserRouter(routes),
});

createRoot(root).render(
  <StrictMode>
    <App services={services} />
  </StrictMode>,
);
