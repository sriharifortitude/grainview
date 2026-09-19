import '@testing-library/jest-dom/vitest';

// jsdom under vitest exposes sessionStorage but, in this version, not
// localStorage. Both are per-viewer conveniences in the app, wrapped in
// try/catch, so a plain in-memory Storage is a faithful stand-in.
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
}
for (const key of ['localStorage', 'sessionStorage'] as const) {
  if ((globalThis as Record<string, unknown>)[key] === undefined) {
    Object.defineProperty(globalThis, key, { value: new MemoryStorage(), configurable: true });
  }
}
