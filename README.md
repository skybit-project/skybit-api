# skybit-api

## Endpoints
- `GET /api/v1/health`
- `GET /api/v1/state`
- `PATCH /api/v1/state` (auth: `x-api-key: <SKYBIT_ADMIN_API_KEY>`)

## WebSocket
- Device (ESP8266): `WS /api/v1/device/ws?token=<SKYBIT_DEVICE_TOKEN>`
- Frontend: `WS /api/v1/frontend/ws`

## Env
- `SKYBIT_ADMIN_API_KEY`
- `SKYBIT_DEVICE_TOKEN`
- `SKYBIT_MAX_SCREEN_TEXT_LEN` (default `32`)
- `SKYBIT_JSON_BODY_LIMIT` (default `10kb`)
