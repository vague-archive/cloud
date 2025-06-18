import { http, HttpResponse } from "npm:msw@2.0.8"
import { setupServer } from "npm:msw@2.0.8/node"

// expose MSW (MockServiceWorker) with slightly nicer interface

export const bypass = {
  server: setupServer,
  handler: http,
  json: HttpResponse.json,
}
