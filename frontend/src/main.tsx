import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';
import { enableMocking } from './enableMocking';
import './index.css';

async function bootstrap() {
  await enableMocking();

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
  </React.StrictMode>,
);
}

void bootstrap();
