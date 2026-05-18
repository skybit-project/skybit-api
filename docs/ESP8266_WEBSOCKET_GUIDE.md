# SkyBit ESP8266 WebSocket Integration Guide

This guide explains how the ESP8266 (NodeMCU) connects to the SkyBit API over WebSocket to:
- Receive the latest **LED + Screen state** in real time
- Send periodic **heartbeat** messages back to the API

## 1) WebSocket URL

### Production
- `wss://skybit-api.mahros.dev/api/v1/device/ws?token=<SKYBIT_DEVICE_TOKEN>`

### Local development
- `ws://<YOUR_PC_IP>:3030/api/v1/device/ws?token=<SKYBIT_DEVICE_TOKEN>`

Notes:
- Use **`wss://`** in production (TLS). If you deploy behind Nginx/reverse-proxy, it should handle TLS and upgrade headers.
- On connect, the server sends the latest state **immediately**.

## 2) Auth / Token

The API supports two modes:

### A) Secured mode (default)
- The device must provide a token.
- Provide token via query param (recommended):
  - `...?token=YOUR_DEVICE_TOKEN`

### B) Public mode (no auth)
- If backend env `SKYBIT_PUBLIC_API=true`, the server accepts device connections without a token.

## 3) Messages (server → ESP8266)

### State message (sent on connect + whenever state updates)
```json
{
  "type": "state",
  "payload": {
    "led": { "r": 255, "g": 0, "b": 0, "mode": "solid" },
    "screen": { "text": "mahros", "mode": "scroll", "speedMs": 30, "size": 2 }
  }
}
```

**LED fields**
- `r`, `g`, `b`: integer `0..255`
- `mode`: currently `"solid"`

**Screen fields**
- `text`: string (length limited by backend, default max `32`)
- `mode`: `"static"` or `"scroll"`
- `speedMs`: integer `10..500` (scroll speed delay)
- `size`: integer `1..4` (text scale)

## 4) Heartbeat (ESP8266 → server)

Send heartbeat periodically so `/api/v1/health` can show the latest heartbeat timestamp.

### Heartbeat message
```json
{
  "type": "heartbeat",
  "payload": {
    "uptimeMs": 123456,
    "rssi": -62
  }
}
```

Payload fields are optional; the server only requires `type: "heartbeat"`.

**Recommended interval:** every **5–15 seconds**.

## 5) Reconnection Strategy (important)

Wi‑Fi and WebSocket can drop. Implement a non-blocking reconnect loop:

1. Ensure Wi‑Fi connected
2. If WS disconnected, reconnect with a backoff (e.g., 1s → 2s → 5s → 10s max)
3. On reconnect, you’ll automatically get the latest `state` again

## 6) Arduino/ESP8266 Example (WebSocketsClient)

This is a minimal example using the popular `arduinoWebSockets` library:

### Libraries
- `ArduinoJson` (for parsing JSON)
- `arduinoWebSockets` (WebSocketsClient)

### Sketch (example)
```cpp
#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

WebSocketsClient webSocket;

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASS = "YOUR_PASS";

// Local dev example:
// const char* WS_HOST = "192.168.1.10";
// const uint16_t WS_PORT = 3030;
// const char* WS_PATH = "/api/v1/device/ws?token=YOUR_DEVICE_TOKEN";

// Production example:
// Use beginSSL(host, port, path) for wss://

unsigned long lastHeartbeatMs = 0;
const unsigned long HEARTBEAT_INTERVAL_MS = 10000;

void onWsEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.println("WS connected");
      break;

    case WStype_DISCONNECTED:
      Serial.println("WS disconnected");
      break;

    case WStype_TEXT: {
      // Parse incoming JSON
      StaticJsonDocument<512> doc;
      DeserializationError err = deserializeJson(doc, payload, length);
      if (err) {
        Serial.print("JSON parse failed: ");
        Serial.println(err.c_str());
        return;
      }

      const char* msgType = doc["type"] | "";
      if (strcmp(msgType, "state") == 0) {
        JsonObject led = doc["payload"]["led"];
        JsonObject screen = doc["payload"]["screen"];

        int r = led["r"] | 0;
        int g = led["g"] | 0;
        int b = led["b"] | 0;
        const char* ledMode = led["mode"] | "solid";

        const char* text = screen["text"] | "";
        const char* screenMode = screen["mode"] | "static";
        int speedMs = screen["speedMs"] | 30;
        int size = screen["size"] | 1;

        // TODO: apply to PWM pins + OLED here
        Serial.printf("LED rgb=(%d,%d,%d) mode=%s\n", r, g, b, ledMode);
        Serial.printf("SCREEN text=%s mode=%s speedMs=%d size=%d\n", text, screenMode, speedMs, size);
      }
      break;
    }

    default:
      break;
  }
}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");

  // Local dev (ws://)
  // webSocket.begin(WS_HOST, WS_PORT, WS_PATH);

  // Production (wss://) example:
  // webSocket.beginSSL("skybit-api.mahros.dev", 443, "/api/v1/device/ws?token=YOUR_DEVICE_TOKEN");

  webSocket.onEvent(onWsEvent);
  webSocket.setReconnectInterval(2000); // auto reconnect every 2s
}

void loop() {
  webSocket.loop();

  // Heartbeat
  unsigned long now = millis();
  if (now - lastHeartbeatMs >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatMs = now;

    StaticJsonDocument<256> hb;
    hb["type"] = "heartbeat";
    hb["payload"]["uptimeMs"] = (uint32_t)now;
    hb["payload"]["rssi"] = WiFi.RSSI();

    String out;
    serializeJson(hb, out);
    webSocket.sendTXT(out);
  }
}
```

## 7) Quick Troubleshooting

- **401 Unauthorized on WS connect**
  - Wrong/missing `token=` (unless backend has `SKYBIT_PUBLIC_API=true`)
- **No state received**
  - Verify correct path: `/api/v1/device/ws`
  - Confirm you are connecting to the correct host/port
- **Works locally but not in production**
  - Ensure reverse proxy supports WebSocket upgrade:
    - `Upgrade` / `Connection` headers
    - `proxy_http_version 1.1`
  - Ensure TLS termination is correct for `wss://`

