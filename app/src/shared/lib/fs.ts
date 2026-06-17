import { invoke } from '@tauri-apps/api/core';
import { remove } from '@tauri-apps/plugin-fs';

export async function copyImageToLocal(sourcePath: string): Promise<string> {
  try {
    const destPath = await invoke<string>('copy_image_to_local', { sourcePath });
    return destPath;
  } catch (error) {
    console.error("Failed to copy image via Rust:", error);
    throw error;
  }
}

export async function deleteLocalImage(path: string): Promise<void> {
  try {
    await remove(path);
  } catch (error) {
    console.warn("Failed to delete local image:", error);
  }
}
