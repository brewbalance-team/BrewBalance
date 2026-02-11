export interface DataStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class InMemoryDataStore implements DataStore {
  private store: Record<string, string> = {};
  getItem(key: string) {
    if (Object.prototype.hasOwnProperty.call(this.store, key)) {
      return this.store[key]!;
    }
    return null;
  }
  setItem(key: string, value: string) {
    this.store[key] = value;
  }
  removeItem(key: string) {
    delete this.store[key];
  }
}

class LocalStorageDataStore implements DataStore {
  getItem(key: string) {
    try {
      const g = globalThis as unknown as { localStorage?: Storage };
      const ls = g.localStorage;
      if (!ls || typeof ls.getItem !== 'function') return null;
      return ls.getItem(key);
    } catch {
      return null;
    }
  }
  setItem(key: string, value: string) {
    try {
      const g = globalThis as unknown as { localStorage?: Storage };
      const ls = g.localStorage;
      if (!ls || typeof ls.setItem !== 'function') return;
      ls.setItem(key, value);
    } catch {
      // swallow
    }
  }
  removeItem(key: string) {
    try {
      const g = globalThis as unknown as { localStorage?: Storage };
      const ls = g.localStorage;
      if (!ls || typeof ls.removeItem !== 'function') return;
      ls.removeItem(key);
    } catch {
      // swallow
    }
  }
}

let defaultStore: DataStore = new LocalStorageDataStore();

export const getDefaultDataStore = (): DataStore => defaultStore;
export const setDefaultDataStore = (s: DataStore) => {
  defaultStore = s;
};

export const createLocalStorageDataStore = (): DataStore => new LocalStorageDataStore();
