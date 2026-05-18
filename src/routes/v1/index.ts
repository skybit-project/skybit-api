/**
 * @file src/routes/v1/index.ts
 * @description v1 routes
 * @author Mahros AL-Qabasy <mahros.dev>
 */
import { Router } from "express";
import { HttpStatus } from "../../constants/httpStatus";
import { requireAdminKey } from "../../middlewares/requireAdminKey";
import { skybitStateService } from "../../services/skybitState.service";


const router = Router();




router.get("/health", async (_req, res) => {
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
});

router.get("/state", async (_req, res) => {
  return res.status(HttpStatus.OK).json({
    success: true,
    data: skybitStateService.getState(),
  });
});

router.patch("/state", requireAdminKey, async (req, res) => {
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
});





/**
 * health
 */

export default router;
