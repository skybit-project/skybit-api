import { config } from "../config";

export const extractDeviceToken = (reqUrl: string | undefined, protocolHeader: string | undefined) => {
  if (config.SKYBIT_PUBLIC_API) return { ok: true as const };
  const expected = config.SKYBIT_DEVICE_TOKEN;
  if (!expected) return { ok: false as const, error: "SKYBIT_DEVICE_TOKEN not configured" };

  let token: string | null = null;

  if (reqUrl) {
    try {
      const url = new URL(reqUrl, "http://localhost");
      token = url.searchParams.get("token");
    } catch {
      // ignore
    }
  }

  if (!token && protocolHeader) {
    // allow passing token via Sec-WebSocket-Protocol for constrained clients
    // we accept either the full header as token, or the first comma-separated entry
    token = protocolHeader.split(",")[0]?.trim() || null;
  }

  if (!token || token !== expected) {
    return { ok: false as const, error: "Unauthorized" };
  }

  return { ok: true as const };
};
