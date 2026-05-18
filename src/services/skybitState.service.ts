import { config } from "../config";
import type WebSocket from "ws";
import type { SkybitLedState, SkybitScreenState, SkybitState } from "../types/skybit.type";

export class SkybitStateService {
  private state: SkybitState = {
    led: { r: 255, g: 0, b: 0, mode: "solid" },
    screen: { text: "mahros", mode: "scroll", speedMs: 30, size: 2 },
  };

  private deviceClients = new Set<WebSocket>();
  private frontendClients = new Set<WebSocket>();

  private lastHeartbeatAt: Date | null = null;

  getState(): SkybitState {
    return this.state;
  }

  getMeta() {
    return {
      deviceClients: this.deviceClients.size,
      frontendClients: this.frontendClients.size,
      lastHeartbeatAt: this.lastHeartbeatAt ? this.lastHeartbeatAt.toISOString() : null,
    };
  }

  setHeartbeatNow() {
    this.lastHeartbeatAt = new Date();
  }

  addClient(kind: "device" | "frontend", ws: WebSocket) {
    const set = kind === "device" ? this.deviceClients : this.frontendClients;
    set.add(ws);
  }

  removeClient(kind: "device" | "frontend", ws: WebSocket) {
    const set = kind === "device" ? this.deviceClients : this.frontendClients;
    set.delete(ws);
  }

  broadcast(kind: "device" | "frontend" | "all", json: string) {
    const sendTo = (clients: Set<WebSocket>) => {
      for (const ws of clients) {
        // 1 === OPEN
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((ws as any).readyState === 1) {
          ws.send(json);
        }
      }
    };

    if (kind === "device" || kind === "all") sendTo(this.deviceClients);
    if (kind === "frontend" || kind === "all") sendTo(this.frontendClients);
  }

  updateState(partial: Partial<SkybitState>): SkybitState {
    const next: SkybitState = {
      led: { ...this.state.led, ...(partial.led || {}) },
      screen: { ...this.state.screen, ...(partial.screen || {}) },
    };

    this.validate(next);
    this.state = next;
    return this.state;
  }

  private validate(state: SkybitState) {
    this.validateLed(state.led);
    this.validateScreen(state.screen);
  }

  private validateLed(led: SkybitLedState) {
    if (led.mode !== "solid") {
      throw new Error("led.mode must be 'solid'");
    }
    for (const [key, value] of Object.entries({ r: led.r, g: led.g, b: led.b })) {
      if (!Number.isInteger(value) || value < 0 || value > 255) {
        throw new Error(`led.${key} must be an integer 0..255`);
      }
    }
  }

  private validateScreen(screen: SkybitScreenState) {
    if (screen.mode !== "static" && screen.mode !== "scroll") {
      throw new Error("screen.mode must be 'static' or 'scroll'");
    }
    if (typeof screen.text !== "string") {
      throw new Error("screen.text must be a string");
    }
    if (screen.text.length > config.SKYBIT_MAX_SCREEN_TEXT_LEN) {
      throw new Error(`screen.text too long (max ${config.SKYBIT_MAX_SCREEN_TEXT_LEN})`);
    }
    if (!Number.isInteger(screen.speedMs) || screen.speedMs < 10 || screen.speedMs > 500) {
      throw new Error("screen.speedMs must be an integer 10..500");
    }
    if (!Number.isInteger(screen.size) || screen.size < 1 || screen.size > 4) {
      throw new Error("screen.size must be an integer 1..4");
    }
  }
}

export const skybitStateService = new SkybitStateService();
