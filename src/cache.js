export class TtlCache {
  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
    this.values = new Map();
  }
  get(key) {
    const item = this.values.get(key);
    if (!item) return undefined;
    if (item.expires <= Date.now()) {
      this.values.delete(key);
      return undefined;
    }
    this.values.delete(key);
    this.values.set(key, item);
    return item.value;
  }
  set(key, value, seconds) {
    if (seconds <= 0) return;
    this.values.delete(key);
    this.values.set(key, { value, expires: Date.now() + seconds * 1000 });
    while (this.values.size > this.maxEntries) {
      this.values.delete(this.values.keys().next().value);
    }
  }
}
