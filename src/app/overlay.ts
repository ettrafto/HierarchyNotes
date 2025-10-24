// IPC functions for overlay window management

import { invoke } from '@tauri-apps/api/core';
import { debug } from '../lib/debug';

export async function spawnOverlay(): Promise<void> {
  debug.log('OVERLAY', '[IPC] Calling spawn_overlay_window');
  try {
    await invoke('spawn_overlay_window');
    debug.log('OVERLAY', '[IPC] Overlay spawned successfully');
  } catch (error) {
    debug.forceError('[IPC] Failed to spawn overlay:', error);
    throw error;
  }
}

