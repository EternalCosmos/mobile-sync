import { Plugin } from "obsidian";
import { HashIndex } from "../shared/types";

const HASH_STORE_KEY = "localSyncHashIndex";

export class MobileHashStore {
  private plugin: Plugin;
  private index: HashIndex = {};

  constructor(plugin: Plugin) {
    this.plugin = plugin;
  }

  async load(): Promise<void> {
    const data = await this.plugin.loadData();
    this.index = (data && data[HASH_STORE_KEY]) ? data[HASH_STORE_KEY] : {};
  }

  async save(): Promise<void> {
    const data = (await this.plugin.loadData()) || {};
    data[HASH_STORE_KEY] = this.index;
    await this.plugin.saveData(data);
  }

  get(path: string): string | undefined {
    return this.index[path];
  }

  set(path: string, hash: string): void {
    this.index[path] = hash;
  }

  delete(path: string): void {
    delete this.index[path];
  }

  keys(): string[] {
    return Object.keys(this.index);
  }

  getAll(): HashIndex {
    return this.index;
  }
}
