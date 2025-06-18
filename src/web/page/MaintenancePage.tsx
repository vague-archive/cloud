import { RequestContext } from "@web"

export function MaintenancePage(_ctx: RequestContext) {
  return (
    <html>
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Maintenance Page</title>
    </head>
    <body>
      <h1>Maintenance Page</h1>
      <p>
        Sorry, we are currently down for maintenance, please try again in a few minutes.
      </p>
    </body>
    </html>
  )
}
