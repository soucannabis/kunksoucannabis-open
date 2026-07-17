import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installGlobalErrorListeners } from '@kunk/api-client';
import { getPublicConfig } from '@kunk/config';
import { installWebVitalsReporter } from './lib/installWebVitals.js';
import './index.css';
import App from './App.jsx';

const bootstrap = getPublicConfig();
installGlobalErrorListeners({ app: 'doc-sign', baseUrl: bootstrap.apiUrl });
installWebVitalsReporter({ app: 'doc-sign', baseUrl: bootstrap.apiUrl });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
