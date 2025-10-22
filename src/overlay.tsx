// Overlay entry point
import React from 'react';
import ReactDOM from 'react-dom/client';
import OverlayPage from './pages/OverlayPage';
import './styles/globals.css';

const root = document.getElementById('root');
if (!root) {
  console.error('❌ OVERLAY: Could not find root element!');
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <OverlayPage />
    </React.StrictMode>
  );
}

