/**
 * @file src/routes/v1/index.ts
 * @description v1 routes
 * @author Mahros AL-Qabasy <mahros.dev>
 */
import { Router } from "express";
import { requireAdminKey } from "../../middlewares/requireAdminKey";
import {
  getDeviceWsHttpHint,
  getFrontendWsHttpHint,
  getSkybitHealth,
  getSkybitState,
  patchSkybitState,
} from "../../controllers/v1/skybit.controller";


const router = Router();




router.get("/health", getSkybitHealth);
router.get("/state", getSkybitState);
router.patch("/state", requireAdminKey, patchSkybitState);

// HTTP fallback routes for clients that hit WS endpoints without Upgrade headers.
router.get("/device/ws", getDeviceWsHttpHint);
router.get("/frontend/ws", getFrontendWsHttpHint);





/**
 * health
 */

export default router;
