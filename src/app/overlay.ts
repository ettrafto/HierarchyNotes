// IPC functions for overlay window management

import { invoke } from '@tauri-apps/api/core';

export async function spawnOverlay(): Promise<void> {
  console.log('[IPC] Calling spawn_overlay_window');
  try {
    await invoke('spawn_overlay_window');
    console.log('[IPC] Overlay spawned successfully');
  } catch (error) {
    console.error('[IPC] Failed to spawn overlay:', error);
    throw error;
  }
}

