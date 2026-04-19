import { Vault } from "obsidian";

export async function ensureParentDirs(vault: Vault, filePath: string): Promise<void> {
  const parts = filePath.split("/");
  parts.pop(); // remove filename
  if (parts.length === 0) return;

  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    const exists = await vault.adapter.exists(current);
    if (!exists) {
      await vault.adapter.mkdir(current);
    }
  }
}
