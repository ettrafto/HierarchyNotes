// Main entry point for Note windows

import React from 'react';
import ReactDOM from 'react-dom/client';
import NotePage from '../pages/NotePage';
import { initializeTheme } from './theme';
import '../styles/globals.css';

// Initialize theme
initializeTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NotePage />
  </React.StrictMode>
);

