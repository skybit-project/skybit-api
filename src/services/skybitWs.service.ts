import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import { extractDeviceToken } from "../middlewares/requireDeviceToken";
import { skybitStateService } from "./skybitState.service";

const sendJson = (ws: WebSocket, data: unknown) => {
  ws.send(JSON.stringify(data));
};

export const attachSkybitWebSockets = (server: http.Server) => {
  const deviceWss = new WebSocketServer({ noServer: true });
  const frontendWss = new WebSocketServer({ noServer: true });

  const sendState = (ws: WebSocket) => {
    sendJson(ws, { type: "state", payload: skybitStateService.getState() });
  };

  const broadcastDeviceStatus = () => {
    const meta = skybitStateService.getMeta();
    skybitStateService.broadcast(
      "frontend",
      JSON.stringify({
        type: "deviceStatus",
        payload: {
          connected: meta.deviceClients > 0,
          lastHeartbeatAt: meta.lastHeartbeatAt,
        },
      }),
    );
  };

  deviceWss.on("connection", (ws) => {
    skybitStateService.addClient("device", ws);
    sendState(ws);
    broadcastDeviceStatus();

    ws.on("message", (buf) => {
      let msg: any;
      try {
        msg = JSON.parse(buf.toString("utf8"));
      } catch {
        return;
      }

      if (msg?.type === "heartbeat") {
        skybitStateService.setHeartbeatNow();
        broadcastDeviceStatus();
      }
    });

    ws.on("close", () => {
      skybitStateService.removeClient("device", ws);
      broadcastDeviceStatus();
    });
  });

  frontendWss.on("connection", (ws) => {
    skybitStateService.addClient("frontend", ws);
    sendState(ws);
    broadcastDeviceStatus();

    ws.on("close", () => {
      skybitStateService.removeClient("frontend", ws);
    });
  });

  server.on("upgrade", (req, socket, head) => {
    let pathname = "";
    try {
      const url = new URL(req.url || "", "http://localhost");
      pathname = url.pathname;
    } catch {
      socket.destroy();
      return;
    }

    const normalizedPath = pathname.replace(/\/+$/, "");

    // Support both "/api/v1/device/ws" and "/device/ws" to be resilient to reverse-proxy path rewriting.
    if (normalizedPath === "/api/v1/device/ws" || normalizedPath === "/device/ws") {
      const auth = extractDeviceToken(req.url, req.headers["sec-websocket-protocol"] as string | undefined);
      if (!auth.ok) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      deviceWss.handleUpgrade(req, socket, head, (ws) => {
        deviceWss.emit("connection", ws, req);
      });
      return;
    }

    if (normalizedPath === "/api/v1/frontend/ws" || normalizedPath === "/frontend/ws") {
      frontendWss.handleUpgrade(req, socket, head, (ws) => {
        frontendWss.emit("connection", ws, req);
      });
      return;
    }

    socket.destroy();
  });
};
