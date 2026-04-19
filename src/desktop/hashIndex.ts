import { Vault, TFile } from "obsidian";
import { HashIndex } from "../shared/types";

export class DesktopHashIndex {
  private index: HashIndex = {};
  private vault: Vault;
  private excludedFolders: string[];

  constructor(vault: Vault, excludedFolders: string[]) {
    this.vault = vault;
    this.excludedFolders = excludedFolders;
  }

  private isExcluded(path: string): boolean {
    if (path.startsWith(".obsidian/")) return true;
    return this.excludedFolders.some((folder) => {
      const prefix = folder.endsWith("/") ? folder : folder + "/";
      return path.startsWith(prefix);
    });
  }

  private async computeHash(content: string): Promise<string> {
    const { createHash } = require("crypto") as typeof import("crypto");
    return createHash("sha256").update(content, "utf8").digest("hex");
  }

  async build(): Promise<void> {
    const files = this.vault.getMarkdownFiles();
    await Promise.all(
      files.map(async (file) => {
        if (this.isExcluded(file.path)) return;
        try {
          const content = await this.vault.cachedRead(file);
          this.index[file.path] = await this.computeHash(content);
        } catch {
          // skip unreadable files
        }
      })
    );
  }

  async onModify(file: TFile): Promise<void> {
    if (this.isExcluded(file.path)) return;
    try {
      const content = await this.vault.cachedRead(file);
      this.index[file.path] = await this.computeHash(content);
    } catch {
      delete this.index[file.path];
    }
  }

  onCreate(file: TFile): void {
    this.onModify(file);
  }

  onDelete(path: string): void {
    delete this.index[path];
  }

  onRename(newPath: string, oldPath: string, file: TFile): void {
    delete this.index[oldPath];
    this.onModify(file);
  }

  getIndex(): HashIndex {
    return this.index;
  }

  getHash(path: string): string | undefined {
    return this.index[path];
  }
}
