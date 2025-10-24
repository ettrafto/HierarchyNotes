// Overlay entry point
import React from 'react';
import ReactDOM from 'react-dom/client';
import OverlayPage from './pages/OverlayPage';
import './styles/globals.css';
import { debug } from './lib/debug';

const root = document.getElementById('root');
if (!root) {
  debug.forceError('❌ OVERLAY: Could not find root element!');
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <OverlayPage />
    </React.StrictMode>
  );
}

