import Transport from "npm:winston-transport@4.7.0"

//-----------------------------------------------------------------------------
//
// WARNING: this transport works fine locally, but will not work in Deno Deploy
// because they don't have a way to enable --unstable-net which is required for
// the Deno.listenDatagram method below
//
//-----------------------------------------------------------------------------
//
// Unfortunately, most of the existing solutions for sending logs to 3rd parties
// rely on underlying node socket code that doesn't exist in Deno. And there is
// not yet any good 3rd party libraries for syslog yet either. So for the time
// being I have written a brutally naive solution (below) that sends the logs
// in plain text over UDP with a socket connection on every log event. This is
// less than ideal for a number of reasons, but it is a start. We should...
//
//   * switch to TLS over TCP
//   * add better error handling and retry logic
//   * switch to a persistent socket connection with a buffer and queue
//   * extract into a proper syslog client library for Deno
//
// This is largely a problem because deno deploy doesn't have any mechanism to
// ship normal logs (e.g. console.log) to a 3rd party either. We might end up
// hosting on a different host (like Fly.io or Render) that has more advanced
// options to do log shipping at the infrastructure level which would elimininate
// the need for this entire module and we could go back to using console.log...
//
// ... but for now this is where we are at.

import glossy from "npm:glossy@0.1.7" // a library for formatting syslog messages, independent of transport options
const producer = new glossy.Produce()

interface Info {
  message: string
}

export class SyslogTransport extends Transport {
  private server: {
    hostname: string
    port: number
  }
  private host: string
  private pid: number
  private appName: string

  constructor(server: {
    hostname: string
    port: number
  }) {
    super()
    this.server = server
    this.host = Deno.hostname()
    this.pid = Deno.pid
    this.appName = "void-cloud"
  }

  async log(info: Info, next: () => void) {
    queueMicrotask(() => {
      this.emit("logged", info)
    })

    const msg = await producer.produce({
      facility: "local4",
      severity: "error",
      host: this.host,
      appName: this.appName,
      pid: this.pid,
      date: new Date(),
      message: info.message,
    })

    const encoder = new TextEncoder()
    const socket = Deno.listenDatagram({ port: 0, transport: "udp", hostname: "0.0.0.0" })
    const syslogMessage = encoder.encode(msg)
    await socket.send(syslogMessage, { ...this.server, transport: "udp" })
    socket.close()

    next()
  }
}
