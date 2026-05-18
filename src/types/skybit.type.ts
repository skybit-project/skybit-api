export type LedMode = "solid";

export type ScreenMode = "static" | "scroll";

export interface SkybitLedState {
  r: number;
  g: number;
  b: number;
  mode: LedMode;
}

export interface SkybitScreenState {
  text: string;
  mode: ScreenMode;
  speedMs: number;
  size: number;
}

export interface SkybitState {
  led: SkybitLedState;
  screen: SkybitScreenState;
}

export type SkybitWsMessage =
  | { type: "state"; payload: SkybitState }
  | {
      type: "deviceStatus";
      payload: { connected: boolean; lastHeartbeatAt: string | null };
    }
  | { type: "heartbeat"; payload?: Record<string, unknown> };

