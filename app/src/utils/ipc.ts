import { invoke } from '@tauri-apps/api/core';
import { relaunch } from '@tauri-apps/plugin-process';

export async function registerStandaloneVcam() {
  try {
    const res = await invoke('register_standalone_vcam');
    console.log(res);
    return true;
  } catch (e) {
    console.warn("Failed to silently register vcam driver:", e);
    return false;
  }
}

export async function syncQualitySettings(resolution: string, filterType: string, fps: number) {
  try {
    await invoke('update_quality_settings', {
      resolution: resolution || '1080p',
      filterType: filterType || 'Lanczos3',
      fps: fps || 30
    });
  } catch (e) {
    console.error("Quality sync error:", e);
  }
}

export async function checkAndUpdateApp(
  updateState: { value: string }, 
  updateDownloadProgress: { value: number },
  readyUpdate: { value: any },
  silent = true
) {
  if (updateState.value !== 'idle') return null;

  try {
    updateState.value = 'checking';
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    
    if (update) {
      updateState.value = 'downloading';
      updateDownloadProgress.value = 0;
      
      let contentLength = 0;
      let downloaded = 0;
      
      await update.download((event: any) => {
        if (event.event === 'Started') {
          contentLength = event.data.contentLength || 0;
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          if (contentLength > 0) {
            updateDownloadProgress.value = Math.round((downloaded / contentLength) * 100);
          }
        }
      });
      
      readyUpdate.value = update;
      updateState.value = 'ready';
      return update;
    } else {
      updateState.value = 'idle';
      return null;
    }
  } catch (err) {
    console.error('Auto update error:', err);
    updateState.value = 'idle';
    if (!silent) throw err;
    return null;
  }
}

export async function installAppUpdate(updateState: { value: string }, readyUpdate: { value: any }) {
  if (updateState.value === 'ready' && readyUpdate.value) {
    await readyUpdate.value.install();
    await relaunch();
  }
}

export async function registerVcamAdmin() {
  try {
    await invoke('register_vcam_admin');
    return true;
  } catch (e) {
    console.warn("User denied admin prompt or error occurred:", e);
    return false;
  }
}

