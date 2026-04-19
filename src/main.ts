import {
  Plugin,
  Platform,
  PluginSettingTab,
  Setting,
  Notice,
  TFile,
  App,
} from "obsidian";
import { SyncPluginSettings, DEFAULT_SETTINGS } from "./settings";

export default class LocalSyncPlugin extends Plugin {
  settings: SyncPluginSettings;
  statusBarItem: HTMLElement | null = null;
  serverAddress: string = "";

  async onload() {
    await this.loadSettings();

    if (!Platform.isMobile) {
      await this.startDesktop();
    } else {
      this.startMobile();
    }

    this.addSettingTab(new LocalSyncSettingTab(this.app, this));
  }

  private async startDesktop() {
    const { DesktopHashIndex } = require("./desktop/hashIndex") as typeof import("./desktop/hashIndex");
    const { SyncServer } = require("./desktop/server") as typeof import("./desktop/server");
    const { getLocalIP } = require("./desktop/networkInfo") as typeof import("./desktop/networkInfo");

    const hashIndex = new DesktopHashIndex(
      this.app.vault,
      this.settings.excludedFolders
    );

    await hashIndex.build();

    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof TFile && file.extension === "md") {
          hashIndex.onModify(file);
        }
      })
    );

    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (file instanceof TFile && file.extension === "md") {
          hashIndex.onCreate(file);
        }
      })
    );

    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (file instanceof TFile) {
          hashIndex.onDelete(file.path);
        }
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (file instanceof TFile && file.extension === "md") {
          hashIndex.onRename(file.path, oldPath, file);
        }
      })
    );

    const server = new SyncServer(
      this.app.vault,
      hashIndex,
      this.settings.port
    );

    try {
      const port = await server.start();
      const ip = await getLocalIP();
      const address = `${ip}:${port}`;
      this.serverAddress = `http://${address}`;
      console.log(`[LocalSync] Server address: ${this.serverAddress}`);

      this.statusBarItem = this.addStatusBarItem();
      this.statusBarItem.setText(`Sync server: running on ${address}`);

      this.register(() => server.stop());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[LocalSync] Failed to start server:", err);
      new Notice(`LocalSync: ${msg}`, 10000);
    }
  }

  private startMobile() {
    this.addRibbonIcon(
      "sync",
      "Sync from PC",
      async () => {
        await this.runSync();
      }
    );

    this.app.workspace.onLayoutReady(async () => {
      await this.runSync();
    });
  }

  private async runSync() {
    const { MobileHashStore } = require("./mobile/hashStore") as typeof import("./mobile/hashStore");
    const { SyncClient } = require("./mobile/syncClient") as typeof import("./mobile/syncClient");

    const hashStore = new MobileHashStore(this);
    await hashStore.load();

    const client = new SyncClient(
      this.app.vault,
      hashStore,
      this.settings.pcServerAddress
    );

    await client.sync();
  }

  async loadSettings() {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings ?? {});
  }

  async saveSettings() {
    const data = (await this.loadData()) || {};
    data.settings = this.settings;
    await this.saveData(data);
  }

  onunload() {
    // cleanup handled via this.register() in startDesktop
  }
}

class LocalSyncSettingTab extends PluginSettingTab {
  plugin: LocalSyncPlugin;

  constructor(app: App, plugin: LocalSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Local Sync Settings" });

    if (!Platform.isMobile) {
      new Setting(containerEl)
        .setName("Server address")
        .setDesc("The address mobile devices should connect to")
        .addText((text) => {
          text.setDisabled(true);
          text.setValue(this.plugin.serverAddress || "starting…");
        });

      new Setting(containerEl)
        .setName("Port")
        .setDesc("Port for the sync server (default: 27123)")
        .addText((text) =>
          text
            .setValue(String(this.plugin.settings.port))
            .onChange(async (value) => {
              const port = parseInt(value, 10);
              if (!isNaN(port) && port > 0 && port < 65536) {
                this.plugin.settings.port = port;
                await this.plugin.saveSettings();
              }
            })
        );

      new Setting(containerEl)
        .setName("Excluded folders")
        .setDesc("Comma-separated list of folders to exclude from sync")
        .addText((text) =>
          text
            .setValue(this.plugin.settings.excludedFolders.join(", "))
            .onChange(async (value) => {
              this.plugin.settings.excludedFolders = value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              await this.plugin.saveSettings();
            })
        );
    } else {
      new Setting(containerEl)
        .setName("PC server address")
        .setDesc("e.g. http://192.168.1.45:27123")
        .addText((text) =>
          text
            .setPlaceholder("http://192.168.1.45:27123")
            .setValue(this.plugin.settings.pcServerAddress)
            .onChange(async (value) => {
              this.plugin.settings.pcServerAddress = value.trim();
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName("Test connection")
        .setDesc("Check if the PC server is reachable")
        .addButton((btn) =>
          btn.setButtonText("Test").onClick(async () => {
            const addr = this.plugin.settings.pcServerAddress.replace(/\/$/, "");
            if (!addr) {
              new Notice("No server address configured");
              return;
            }
            try {
              const res = await fetch(`${addr}/manifest`);
              if (res.ok) {
                new Notice("Connection successful");
              } else {
                new Notice(`Connection failed: HTTP ${res.status}`);
              }
            } catch {
              new Notice("Connection failed: could not reach PC");
            }
          })
        );
    }
  }
}
