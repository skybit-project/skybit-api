import * as dotenv from "dotenv";
import path from "path";
import { HttpStatus } from "../constants/httpStatus";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });


const PORT = Number(process.env.PORT) || 3030;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SKYBIT_ADMIN_API_KEY = process.env.SKYBIT_ADMIN_API_KEY;
const SKYBIT_DEVICE_TOKEN = process.env.SKYBIT_DEVICE_TOKEN;

if (!GEMINI_API_KEY) {
  console.warn("Warning: GEMINI_API_KEY is not set. Please set it in the .env file.");
}

const requireProdSecret = (name: string, value: string | undefined) => {
  if (process.env.NODE_ENV === "production" && (!value || !value.trim())) {
    throw new Error(`${name} is required in production`);
  }
};

requireProdSecret("SKYBIT_ADMIN_API_KEY", SKYBIT_ADMIN_API_KEY);
requireProdSecret("SKYBIT_DEVICE_TOKEN", SKYBIT_DEVICE_TOKEN);

const parseEnvNumber = (value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const SKYBIT_MAX_SCREEN_TEXT_LEN = parseEnvNumber(
  process.env.SKYBIT_MAX_SCREEN_TEXT_LEN,
  32,
);

const SKYBIT_JSON_BODY_LIMIT = (process.env.SKYBIT_JSON_BODY_LIMIT || "10kb").trim() || "10kb";

const DEFAULT_LAT = parseEnvNumber(process.env.DEFAULT_LAT, 29.44);
const DEFAULT_LON = parseEnvNumber(process.env.DEFAULT_LON, 32.36);
const DEFAULT_CITY = (process.env.DEFAULT_CITY || "Galala").trim() || "Galala";

const HEAT_TEMP_C = parseEnvNumber(process.env.HEAT_TEMP_C, 35);
const RAIN_PROB_PCT = parseEnvNumber(process.env.RAIN_PROB_PCT, 50);
const WIND_WARNING_KMH = parseEnvNumber(process.env.WIND_WARNING_KMH, 30);

export const config = {

  PORT,
  SERVER_ERROR_CODE: HttpStatus.INTERNAL_SERVER_ERROR,
  GEMINI_API_KEY,
  SKYBIT_ADMIN_API_KEY,
  SKYBIT_DEVICE_TOKEN,
  SKYBIT_MAX_SCREEN_TEXT_LEN,
  SKYBIT_JSON_BODY_LIMIT,

  DEFAULT_LAT,
  DEFAULT_LON,
  DEFAULT_CITY,

  HEAT_TEMP_C,
  RAIN_PROB_PCT,
  WIND_WARNING_KMH,

};
