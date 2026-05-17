/**
 * @file src/routes/v1/index.ts
 * @description v1 routes
 * @author Mahros AL-Qabasy <mahros.dev>
 */
import multer from "multer";
import { Router } from "express";
import { config } from "../../config";
import { HttpStatus } from "../../constants/httpStatus";


const router = Router();




router.get("/health", async (req, res) => {
  return res.status(HttpStatus.OK).json({
    success: true,
    service: "meteora-weather-api",
    status: "online",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});





/**
 * health
 */

export default router;
