import { Vault, Notice } from "obsidian";
import { Manifest, ManifestFile, SyncResult } from "../shared/types";
import { MobileHashStore } from "./hashStore";
import { ensureParentDirs } from "./directoryWriter";

const BATCH_SIZE = 20;

async function computeHash(content: string): Promise<string> {
  const encoded = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class SyncClient {
  private vault: Vault;
  private hashStore: MobileHashStore;
  private serverAddress: string;

  constructor(vault: Vault, hashStore: MobileHashStore, serverAddress: string) {
    this.vault = vault;
    this.hashStore = hashStore;
    this.serverAddress = serverAddress.replace(/\/$/, "");
  }

  async sync(): Promise<void> {
    if (!this.serverAddress) {
      new Notice("Sync failed: no PC server address configured");
      return;
    }

    let manifest: Manifest;
    try {
      const res = await fetch(`${this.serverAddress}/manifest`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      manifest = await res.json();
    } catch {
      new Notice("Sync failed: could not reach PC");
      return;
    }

    const remoteMap = new Map<string, ManifestFile>(
      manifest.files.map((f) => [f.path, f])
    );

    const toDownload: ManifestFile[] = [];
    const toDelete: string[] = [];
    const result: SyncResult = { newFiles: 0, changedFiles: 0, deletedFiles: 0 };

    for (const [path, file] of remoteMap) {
      const localHash = this.hashStore.get(path);
      if (!localHash) {
        toDownload.push(file);
        result.newFiles++;
      } else if (localHash !== file.hash) {
        toDownload.push(file);
        result.changedFiles++;
      }
    }

    for (const localPath of this.hashStore.keys()) {
      if (!remoteMap.has(localPath)) {
        toDelete.push(localPath);
        result.deletedFiles++;
      }
    }

    for (let i = 0; i < toDownload.length; i += BATCH_SIZE) {
      const batch = toDownload.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map((file) => this.downloadFile(file)));
    }

    for (const path of toDelete) {
      try {
        const exists = await this.vault.adapter.exists(path);
        if (exists) {
          await this.vault.adapter.remove(path);
        }
        this.hashStore.delete(path);
      } catch {
        // skip
      }
    }

    await this.hashStore.save();

    const { newFiles, changedFiles, deletedFiles } = result;
    if (newFiles === 0 && changedFiles === 0 && deletedFiles === 0) {
      new Notice("Already up to date");
    } else {
      new Notice(
        `Synced: ${newFiles} new, ${changedFiles} changed, ${deletedFiles} deleted`
      );
    }
  }

  private async downloadFile(file: ManifestFile): Promise<void> {
    try {
      const res = await fetch(
        `${this.serverAddress}/file?path=${encodeURIComponent(file.path)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const content = await res.text();
      await ensureParentDirs(this.vault, file.path);
      await this.vault.adapter.write(file.path, content);
      const actualHash = await computeHash(content);
      this.hashStore.set(file.path, actualHash);
    } catch {
      // skip failed file, will retry next sync
    }
  }
}
