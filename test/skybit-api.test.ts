import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "http";
import type { AddressInfo } from "net";
import WebSocket from "ws";
import request from "supertest";

let server: http.Server;
let baseUrl: string;
let agent: request.SuperTest<request.Test>;

beforeAll(async () => {
  process.env.SKYBIT_ADMIN_API_KEY = "test-admin";
  process.env.SKYBIT_DEVICE_TOKEN = "test-device";
  process.env.SKYBIT_MAX_SCREEN_TEXT_LEN = "8";
  process.env.SKYBIT_JSON_BODY_LIMIT = "10kb";

  const { createApp } = await import("../src/app");
  const { attachSkybitWebSockets } = await import("../src/services/skybitWs.service");

  const app = createApp();
  server = http.createServer(app);
  attachSkybitWebSockets(server);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
  agent = request(baseUrl);
});

afterAll(async () => {
  if (!server) return;
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("SkyBit REST", () => {
  it("GET /api/v1/state returns default state", async () => {
    const res = await agent.get("/api/v1/state").expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.led).toMatchObject({ r: 255, g: 0, b: 0, mode: "solid" });
    expect(res.body.data.screen).toMatchObject({ text: "mahros", mode: "scroll", speedMs: 30, size: 2 });
  });

  it("PATCH /api/v1/state rejects without key", async () => {
    await agent.patch("/api/v1/state").send({ led: { r: 1 } }).expect(401);
  });

  it("PATCH /api/v1/state accepts with x-api-key and validates", async () => {
    const ok = await agent
      .patch("/api/v1/state")
      .set("x-api-key", "test-admin")
      .send({ led: { r: 1, g: 2, b: 3 }, screen: { text: "hi", mode: "static", speedMs: 20, size: 1 } })
      .expect(200);
    expect(ok.body.data.led).toMatchObject({ r: 1, g: 2, b: 3 });

    await agent
      .patch("/api/v1/state")
      .set("x-api-key", "test-admin")
      .send({ led: { r: 999 } })
      .expect(400);

    await agent
      .patch("/api/v1/state")
      .set("x-api-key", "test-admin")
      .send({ screen: { text: "toolonggg" } })
      .expect(400);
  });
});

describe("SkyBit WebSocket", () => {
  it("device connects and receives initial state; heartbeat updates /health", async () => {
    const ws = new WebSocket(`${baseUrl.replace("http", "ws")}/api/v1/device/ws?token=test-device`);

    const first = await new Promise<any>((resolve, reject) => {
      ws.once("message", (data) => resolve(JSON.parse(data.toString())));
      ws.once("error", reject);
    });

    expect(first.type).toBe("state");
    expect(first.payload.led).toBeDefined();

    ws.send(JSON.stringify({ type: "heartbeat", payload: { uptimeMs: 123 } }));

    // allow server to process
    await new Promise((r) => setTimeout(r, 30));

    const health = await agent.get("/api/v1/health").expect(200);
    expect(health.body.device.lastHeartbeatAt).toBeTruthy();

    ws.close();
  });

  it("frontend connects and receives state; receives broadcast after PATCH", async () => {
    const ws = new WebSocket(`${baseUrl.replace("http", "ws")}/api/v1/frontend/ws`);

    const initial = await new Promise<any>((resolve, reject) => {
      ws.once("message", (data) => resolve(JSON.parse(data.toString())));
      ws.once("error", reject);
    });
    expect(initial.type).toBe("state");

    const nextMsgPromise = new Promise<any>((resolve) => {
      ws.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === "state") resolve(msg);
      });
    });

    await agent
      .patch("/api/v1/state")
      .set("x-api-key", "test-admin")
      .send({ led: { r: 10, g: 20, b: 30 } })
      .expect(200);

    const next = await nextMsgPromise;
    expect(next.payload.led).toMatchObject({ r: 10, g: 20, b: 30 });

    ws.close();
  });
});

