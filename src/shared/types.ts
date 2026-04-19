export interface ManifestFile {
  path: string;
  hash: string;
  size: number;
  mtime: number;
}

export interface Manifest {
  generated_at: number;
  files: ManifestFile[];
}

export interface SyncResult {
  newFiles: number;
  changedFiles: number;
  deletedFiles: number;
}

export interface HashIndex {
  [path: string]: string;
}
