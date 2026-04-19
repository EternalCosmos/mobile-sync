import { Vault } from "obsidian";
import { DesktopHashIndex } from "./hashIndex";
import { Manifest, ManifestFile } from "../shared/types";

export class SyncServer {
  private server: import("http").Server | null = null;
  private port: number;
  private vault: Vault;
  private hashIndex: DesktopHashIndex;
  private actualPort: number = 0;

  constructor(vault: Vault, hashIndex: DesktopHashIndex, port: number) {
    this.vault = vault;
    this.hashIndex = hashIndex;
    this.port = port;
  }

  async start(): Promise<number> {
    const http = require("http") as typeof import("http");

    const ALLOWED_ORIGINS = ["capacitor://localhost", "http://localhost"];

    const server = http.createServer(async (req, res) => {
      const origin = req.headers.origin ?? "";
      if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
      }
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url ?? "/", `http://localhost`);

      if (url.pathname === "/manifest") {
        try {
          const index = this.hashIndex.getIndex();
          const files: ManifestFile[] = Object.entries(index).map(([path, hash]) => {
            const file = this.vault.getFileByPath(path);
            return {
              path,
              hash,
              size: file ? file.stat.size : 0,
              mtime: file ? file.stat.mtime : 0,
            };
          });
          const manifest: Manifest = { generated_at: Date.now(), files };
          const body = JSON.stringify(manifest);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(body);
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Failed to generate manifest" }));
        }
        return;
      }

      if (url.pathname === "/file") {
        const filePath = url.searchParams.get("path");
        if (!filePath) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing path parameter" }));
          return;
        }
        const sanitized = filePath.replace(/^\/+/, "");
        try {
          const file = this.vault.getFileByPath(sanitized);
          if (!file) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "File not found" }));
            return;
          }
          const content = await this.vault.read(file);
          res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
          res.end(content, "utf8");
        } catch {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Failed to read file" }));
        }
        return;
      }

      res.writeHead(404);
      res.end();
    });

    return new Promise((resolve, reject) => {
      const tryListen = (port: number, attempts: number) => {
        server.listen(port, () => {
          this.server = server;
          this.actualPort = port;
          console.log(`[Obsyncdian] Server listening on port ${port}`);
          resolve(port);
        });
        server.once("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "EADDRINUSE" && attempts > 0) {
            server.close();
            tryListen(port + 1, attempts - 1);
          } else {
            reject(err);
          }
        });
      };
      tryListen(this.port, 5);
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  getPort(): number {
    return this.actualPort;
  }
}
