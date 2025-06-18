import winston from "npm:winston@3.11.0"
import { MESSAGE } from "npm:triple-beam@1.4.1"

import { config } from "@config"
import { redact } from "@lib/params"
import { PapertrailTransport } from "./logger/papertrail.ts"

//-----------------------------------------------------------------------------

const Levels = {
  silent: -1,
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}

const Colors = {
  silent: "black",
  error: "red",
  warn: "yellow",
  info: "green",
  debug: "blue",
}

export type LogLevel = "silent" | "error" | "warn" | "info" | "debug"

export enum Facility {
  User = "user",
}

//-----------------------------------------------------------------------------

export function pp(data: unknown) {
  return sanitizeAlertWords(pjson(redact(data)))
}

function json(data: unknown) {
  return JSON.stringify(data)
}

function pjson(data: unknown) {
  return JSON.stringify(data, null, 2)
}

export function sanitizeAlertWords(message: string) {
  const re = /(crash|error|exception|failed)/gi
  return message.replaceAll(re, "[ALERTWORD]")
}

const redactor = winston.format((info) => {
  const redacted = redact(info)
  return {
    ...info,
    ...redacted,
  }
})

const cli = winston.format((info, opts) => {
  if (opts.meta) {
    const { level: _level, message: _message, ...rest } = info
    if (Object.keys(rest).length > 0) {
      info[MESSAGE] = `${info[MESSAGE]} ${opts.meta === "pretty" ? pjson(rest) : json(rest)}`
    }
  }
  return info
})

//-----------------------------------------------------------------------------

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.cli(),
      cli({ meta: config.logger.metadata }),
      config.logger.colorized ? winston.format.colorize() : winston.format.uncolorize(),
    ),
  }),
]

if (config.logger.papertrailToken) {
  console.log("PAPERTRAIL LOGGING ENABLED")
  transports.push(
    new PapertrailTransport({
      token: config.logger.papertrailToken,
      appName: config.logger.papertrailApp,
    }),
  )
}

export const logger = winston.createLogger({
  levels: Levels,
  level: config.logger.level,
  format: winston.format.combine(redactor()), // ALL transports get redacted
  transports,
})

winston.addColors(Colors)

//-----------------------------------------------------------------------------
