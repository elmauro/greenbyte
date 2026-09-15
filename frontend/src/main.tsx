import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';
import { enableMocking } from './enableMocking';
import { LocaleProvider } from './i18n';
import './index.css';

async function bootstrap() {
  await enableMocking();

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <LocaleProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </LocaleProvider>
    </React.StrictMode>,
  );
}

void bootstrap();
