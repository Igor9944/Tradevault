// Error-safe storage helper to prevent quota or security exceptions in WebViews,
// Private Browsing (Safari), or environments with restricted cookies/storage.

class SafeStorage implements Storage {
  private fallbackMemory: Record<string, string> = {};
  private isSupported: boolean;
  private storageType: 'localStorage' | 'sessionStorage';

  constructor(type: 'localStorage' | 'sessionStorage') {
    this.storageType = type;
    this.isSupported = this.checkSupport();
  }

  private checkSupport(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      const storage = window[this.storageType];
      if (!storage) return false;
      const testKey = '__storage_test__';
      storage.setItem(testKey, testKey);
      const retrieved = storage.getItem(testKey);
      storage.removeItem(testKey);
      return retrieved === testKey;
    } catch (e) {
      return false;
    }
  }

  get length(): number {
    if (this.isSupported) {
      try {
        return window[this.storageType].length;
      } catch (e) {
        return Object.keys(this.fallbackMemory).length;
      }
    }
    return Object.keys(this.fallbackMemory).length;
  }

  clear(): void {
    this.fallbackMemory = {};
    if (this.isSupported) {
      try {
        window[this.storageType].clear();
      } catch (e) {
        // ignore
      }
    }
  }

  getItem(key: string): string | null {
    if (this.isSupported) {
      try {
        return window[this.storageType].getItem(key);
      } catch (e) {
        return this.fallbackMemory[key] || null;
      }
    }
    return this.fallbackMemory[key] || null;
  }

  key(index: number): string | null {
    if (this.isSupported) {
      try {
        return window[this.storageType].key(index);
      } catch (e) {
        return Object.keys(this.fallbackMemory)[index] || null;
      }
    }
    return Object.keys(this.fallbackMemory)[index] || null;
  }

  removeItem(key: string): void {
    delete this.fallbackMemory[key];
    if (this.isSupported) {
      try {
        window[this.storageType].removeItem(key);
      } catch (e) {
        // ignore
      }
    }
  }

  setItem(key: string, value: string): void {
    if (this.isSupported) {
      try {
        window[this.storageType].setItem(key, value);
        return;
      } catch (e) {
        console.warn(`[SafeStorage] write error for key "${key}". Falling back to memory storage.`, e);
      }
    }
    this.fallbackMemory[key] = String(value);
  }
}

export const safeLocalStorage = new SafeStorage('localStorage');
export const safeSessionStorage = new SafeStorage('sessionStorage');
