/**
 * Centralized Debug Configuration
 * 
 * Set flags to `true` to enable console logging for specific modules.
 * All flags default to `false` for production-ready code.
 */

export const DEBUG = {
  // Core Systems
  STORE: false,           // State management operations
  IPC: false,             // IPC communication with Rust backend
  PERSISTENCE: false,     // Save/Load operations
  
  // Components
  NOTE_GHOSTS: false,     // Note ghost rendering on board
  NOTE_LIST: false,       // Notes list sidebar
  NOTE_SHELL: false,      // Individual note window shell
  NOTE_PAGE: false,       // Note window page logic
  
  // Pages
  BOARD_PAGE: false,      // Main board page
  OVERLAY_PAGE: false,    // Overlay window page
  OVERLAY: false,         // Overlay spawn/IPC
  
  // Features
  WINDOW_LIFECYCLE: false, // Window open/close/focus events
  WINDOW_POSITION: false,  // Window position and resize tracking
  CONNECTIONS: false,      // Link/connection rendering
  RESIZE: true,            // Board-side resize mode and operations
  
  // Development
  RENDER: false,          // Component render cycles
  EVENTS: false,          // Event handlers and listeners
} as const;

/**
 * Debug logger helper - only logs if the flag is enabled
 */
export const debug = {
  log: (flag: keyof typeof DEBUG, ...args: any[]) => {
    if (DEBUG[flag]) {
      console.log(...args);
    }
  },
  warn: (flag: keyof typeof DEBUG, ...args: any[]) => {
    if (DEBUG[flag]) {
      console.warn(...args);
    }
  },
  error: (flag: keyof typeof DEBUG, ...args: any[]) => {
    if (DEBUG[flag]) {
      console.error(...args);
    }
  },
  // Always log errors regardless of flags
  forceError: (...args: any[]) => {
    console.error(...args);
  },
};

