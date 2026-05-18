import type { Request, Response } from "express";
import { HttpStatus } from "../../constants/httpStatus";
import { skybitStateService } from "../../services/skybitState.service";

export const getSkybitHealth = async (_req: Request, res: Response) => {
  const meta = skybitStateService.getMeta();
  return res.status(HttpStatus.OK).json({
    success: true,
    service: "skybit-api",
    status: "online",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    clients: {
      device: meta.deviceClients,
      frontend: meta.frontendClients,
    },
    device: {
      lastHeartbeatAt: meta.lastHeartbeatAt,
    },
  });
};

export const getSkybitState = async (_req: Request, res: Response) => {
  return res.status(HttpStatus.OK).json({
    success: true,
    data: skybitStateService.getState(),
  });
};

export const patchSkybitState = async (req: Request, res: Response) => {
  try {
    const next = skybitStateService.updateState(req.body || {});
    const msg = JSON.stringify({ type: "state", payload: next });
    skybitStateService.broadcast("all", msg);

    return res.status(HttpStatus.OK).json({
      success: true,
      data: next,
    });
  } catch (err: any) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      error: err?.message || "Invalid payload",
    });
  }
};

export const getDeviceWsHttpHint = async (_req: Request, res: Response) => {
  // If a client hits this endpoint as plain HTTP (no Upgrade header), provide a helpful response
  // instead of returning Express 404.
  const example = { type: "state", payload: skybitStateService.getState() };
  return res.status(HttpStatus.UPGRADE_REQUIRED).json({
    success: false,
    error: "Upgrade Required",
    message: "This endpoint is a WebSocket endpoint. Connect using ws:// or wss:// and a WebSocket client.",
    wsPath: "/api/v1/device/ws",
    exampleFirstMessage: example,
  });
};

export const getFrontendWsHttpHint = async (_req: Request, res: Response) => {
  const example = { type: "state", payload: skybitStateService.getState() };
  return res.status(HttpStatus.UPGRADE_REQUIRED).json({
    success: false,
    error: "Upgrade Required",
    message: "This endpoint is a WebSocket endpoint. Connect using ws:// or wss:// and a WebSocket client.",
    wsPath: "/api/v1/frontend/ws",
    exampleFirstMessage: example,
  });
};

