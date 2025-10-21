// Main entry point for Board window

import React from 'react';
import ReactDOM from 'react-dom/client';
import BoardPage from '../pages/BoardPage';
import { initializeTheme } from './theme';
import '../styles/globals.css';

// Initialize theme
initializeTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BoardPage />
  </React.StrictMode>
);

