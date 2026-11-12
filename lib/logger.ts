import pino from "pino";
import { settings } from "./config";

export const logger = pino({
  level: settings.DEBUG ? "debug" : "info"
});

