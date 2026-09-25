import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AutopilotProvider } from './context/AutopilotContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AutopilotProvider>
      <App />
    </AutopilotProvider>
  </StrictMode>,
);
