import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initFirebaseRealtime } from './services/firebaseRealtime';

// Auto-initialize Firebase Realtime Database if on index.html (online/github sync), or offline if on index-offline.html
initFirebaseRealtime();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
