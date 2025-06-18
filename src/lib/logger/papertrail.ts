import Transport from "npm:winston-transport@4.7.0"
import { encodeBase64 } from "@std/encoding"
import { Facility, LogLevel } from "@lib/logger"

import glossy from "npm:glossy@0.1.7" // a library for formatting syslog messages, independent of transport options
const producer = new glossy.Produce()

interface Info {
  level: LogLevel
  message: string
}

interface PapertrailOptions {
  token: string
  appName?: string
  endpoint?: string
}

export class PapertrailTransport extends Transport {
  private appName: string
  private token: string
  private endpoint: string
  private host: string
  private pid: number

  constructor(opts: PapertrailOptions) {
    super()
    this.appName = opts.appName ?? "void-cloud"
    this.token = opts.token
    this.endpoint = opts.endpoint ?? "https://logs.collector.solarwinds.com/v1/log"
    this.host = Deno.hostname()
    this.pid = Deno.pid
  }

  log(info: Info, next: () => void) {
    queueMicrotask(() => {
      this.emit("logged", info)
    })

    const msg = producer.produce({
      facility: Facility.User,
      severity: info.level,
      host: this.host,
      appName: this.appName,
      pid: this.pid,
      date: new Date(),
      message: info.message,
    })

    const credentials = `:${this.token}`

    fetch(this.endpoint, {
      method: "POST",
      body: msg,
      headers: {
        "Content-Type": "text/plain",
        "Authorization": `Basic ${encodeBase64(credentials)}`,
      },
    })

    next()
  }
}
