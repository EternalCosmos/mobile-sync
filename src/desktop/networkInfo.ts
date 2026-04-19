function isPrivateIP(address: string): boolean {
  return (
    address.startsWith("192.168.") ||
    address.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(address)
  );
}

export async function getLocalIP(): Promise<string> {
  const os = require("os") as typeof import("os");
  const interfaces = os.networkInterfaces();
  let fallback: string | null = null;

  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;
    for (const entry of iface) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      if (isPrivateIP(entry.address)) return entry.address;
      if (!fallback) fallback = entry.address;
    }
  }

  return fallback ?? "127.0.0.1";
}
