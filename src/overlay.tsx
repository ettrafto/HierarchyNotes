// Overlay entry point
import React from 'react';
import ReactDOM from 'react-dom/client';
import OverlayPage from './pages/OverlayPage';
import './styles/globals.css';

console.log('╔═══════════════════════════════════════════╗');
console.log('║  OVERLAY.TSX LOADING                      ║');
console.log('║  Window label:', window.location.href);
console.log('╚═══════════════════════════════════════════╝');

const root = document.getElementById('root');
if (!root) {
  console.error('❌ OVERLAY: Could not find root element!');
} else {
  console.log('✅ OVERLAY: Found root element, mounting React...');
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <OverlayPage />
    </React.StrictMode>
  );
  console.log('✅ OVERLAY: React mounted');
}

