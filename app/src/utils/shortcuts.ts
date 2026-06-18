import { register, unregister, unregisterAll, isRegistered } from '@tauri-apps/plugin-global-shortcut';

type ShortcutCallback = () => void;

class ShortcutManager {
  private registeredShortcuts = new Map<string, ShortcutCallback>();
  private activeTimers = new Map<string, { timeout: ReturnType<typeof setTimeout>, interval?: ReturnType<typeof setInterval> }>();

  async register(shortcut: string, callback: ShortcutCallback) {
    if (await isRegistered(shortcut)) {
      await this.unregister(shortcut);
    }
    
    try {
      await register(shortcut, (event) => {
        const cb = this.registeredShortcuts.get(shortcut);
        if (!cb) return;

        if (event.state === 'Pressed') {
          if (!this.activeTimers.has(shortcut)) {
            cb(); // Call immediately on first press
            
            // Wait 400ms before repeating (simulating OS key repeat delay)
            const timeout = setTimeout(() => {
              const interval = setInterval(() => {
                cb();
              }, 50); // Repeat every 50ms
              
              const timer = this.activeTimers.get(shortcut);
              if (timer) {
                timer.interval = interval;
              }
            }, 400);

            this.activeTimers.set(shortcut, { timeout });
          }
        } else if (event.state === 'Released') {
          const timer = this.activeTimers.get(shortcut);
          if (timer) {
            clearTimeout(timer.timeout);
            if (timer.interval) {
              clearInterval(timer.interval);
            }
            this.activeTimers.delete(shortcut);
          }
        }
      });
      this.registeredShortcuts.set(shortcut, callback);
    } catch (error: any) {
      console.error(`Failed to register shortcut ${shortcut}`, error);
      alert(`⚠️ Không thể gán phím tắt: "${shortcut}"\n\nTổ hợp phím này đã bị Windows hoặc một phần mềm khác (như Chrome, Zalo, driver màn hình...) chiếm dụng.\n\n👉 Mẹo: Hãy bấm "OK" rồi thử đổi sang tổ hợp khác (VD: Alt + Shift + Phím mũi tên).`);
    }
  }

  async unregister(shortcut: string) {
    try {
      if (await isRegistered(shortcut)) {
        await unregister(shortcut);
      }
      this.registeredShortcuts.delete(shortcut);
      
      const timer = this.activeTimers.get(shortcut);
      if (timer) {
        clearTimeout(timer.timeout);
        if (timer.interval) clearInterval(timer.interval);
        this.activeTimers.delete(shortcut);
      }
    } catch (error) {
      console.error(`Failed to unregister shortcut ${shortcut}`, error);
    }
  }

  async unregisterAll() {
    try {
      await unregisterAll();
      this.registeredShortcuts.clear();
      
      for (const timer of this.activeTimers.values()) {
        clearTimeout(timer.timeout);
        if (timer.interval) clearInterval(timer.interval);
      }
      this.activeTimers.clear();
    } catch (error) {
      console.error('Failed to unregister all shortcuts', error);
    }
  }

  async syncShortcuts(
    shortcuts: { shortcut?: string; callback: ShortcutCallback }[]
  ) {
    await this.unregisterAll();
    
    for (const { shortcut, callback } of shortcuts) {
      if (shortcut) {
        await this.register(shortcut, callback);
      }
    }
  }
}

export const shortcutManager = new ShortcutManager();
