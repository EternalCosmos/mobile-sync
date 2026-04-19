export interface SyncPluginSettings {
  port: number;
  excludedFolders: string[];
  pcServerAddress: string;
}

export const DEFAULT_SETTINGS: SyncPluginSettings = {
  port: 27123,
  excludedFolders: [],
  pcServerAddress: "",
};
