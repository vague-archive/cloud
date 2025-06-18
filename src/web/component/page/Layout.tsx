import { Config } from "@config"
import { Children } from "@lib/jsx"
import { CTX, RequestContext } from "@web"
import { Header } from "@web/component"

//-------------------------------------------------------------------------------------------------

function PageLayout({
  ctx,
  title,
  page,
  children,
  header,
}: {
  ctx: RequestContext
  title?: string
  page: string
  children?: Children
  header?: Children
}) {
  return (
    <html class="h-full">
      <Head ctx={ctx} title={title} />
      <body class="h-full flex flex-col overflow-hidden">
        <Header ctx={ctx} title={title} page={page}>
          {header}
        </Header>
        <div class="h-full flex-1 overflow-auto bg-gray-50">
          <div class="px-4 py-8 max-w-5xl mx-auto">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}

//-------------------------------------------------------------------------------------------------

function FullScreenLayout({
  ctx,
  title,
  page,
  children,
  header,
}: {
  ctx: RequestContext
  title?: string
  page: string
  children?: Children
  header?: Children
}) {
  return (
    <html class="h-full">
      <Head ctx={ctx} title={title} />
      <body class="h-full flex flex-col overflow-hidden">
        <Header ctx={ctx} title={title} page={page}>
          {header}
        </Header>
        <div class="h-full w-full flex-1 overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  )
}

//-------------------------------------------------------------------------------------------------

function EmptyLayout({
  ctx,
  title,
  children,
}: {
  ctx: RequestContext
  title?: string
  children?: Children
}) {
  return (
    <html class="h-full">
      <Head ctx={ctx} title={title} />
      <body class="h-full bg-graphpaper">
        {children}
      </body>
    </html>
  )
}

//-------------------------------------------------------------------------------------------------

function ModalLayout({
  ctx,
  title,
  children,
}: {
  ctx: RequestContext
  title?: string
  children?: Children
}) {
  return (
    <html class="h-full">
      <Head ctx={ctx} title={title} />
      <body class="h-full bg-graphpaper">
        <modal-outer-container>
        <modal-inner-container>
        <modal-card>
          {children}
        </modal-card>
        </modal-inner-container>
        </modal-outer-container>
      </body>
    </html>
  )
}

//-------------------------------------------------------------------------------------------------

function Head({
  ctx,
  title,
}: {
  ctx: RequestContext
  title?: string
}) {
  const config = CTX.config(ctx)
  const manifest = CTX.manifest(ctx)
  const csrf = ctx.state.session?.csrf
  return (
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      {csrf && <meta name="csrf-token" content={csrf} />}
      <Hmr config={config} />
      <title>{title ?? "Void Cloud"}</title>
      <link rel="stylesheet" href={manifest("/assets/styles.css")} />
      <link rel="stylesheet" href="/vendor/highlight@11.9.0.min.css" />
      <script defer type="text/javascript" src={manifest("/assets/vendor.ts")} />
      <script defer type="text/javascript" src={manifest("/assets/script.ts")} />
    </head>
  )
}

function Hmr(props: {
  config: Config
}) {
  const { config } = props
  if (config.web.hmr) {
    const url = new URL("/hmr", config.web.publicUrl)
    url.protocol = url.protocol === "http:" ? "ws:" : "wss:"
    return <meta name="hmr" content={url.toString()} />
  } else {
    return <></>
  }
}
//-------------------------------------------------------------------------------------------------

export const Layout = {
  Page: PageLayout,
  FullScreen: FullScreenLayout,
  Empty: EmptyLayout,
  Modal: ModalLayout,
}

//-------------------------------------------------------------------------------------------------
