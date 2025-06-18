// deno-lint-ignore-file no-window
import "@vaguevoid/design-system/components"

console.log("Ready...")

const csrfToken = document.querySelector("meta[name='csrf-token']")?.getAttribute("content")
const hmr = document.querySelector("meta[name='hmr']")?.getAttribute("content")

document.body.addEventListener("htmx:configRequest", function (e) {
  const custom = e as CustomEvent
  custom.detail.headers["X-CSRFToken"] = csrfToken
})

if (hmr) {
  const ws = new WebSocket(hmr)
  ws.addEventListener("open", () => {
    console.log("hmr websocket open")
  })
  ws.addEventListener("close", () => {
    console.log("hmr websocket closed")
  })
  ws.addEventListener("message", (event) => {
    if (event.data === "reload") {
      console.log("hmr websocket reloading")
      location.reload()
    }
  })
}

//=================================================================================================
// HELPERS USED BY INLINE Htmx (hx-*) and Alpine.js (x-*) attributes
//=================================================================================================

// WARNING: keep in sync with server side method in src/lib/format.ts
function slugify(name: string) {
  return name.toLowerCase().trim()
    .replace(/'s/g, "s")
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/-$/, "")
}

const hxHelpers = {
  slugify,
  timezone: () => Intl.DateTimeFormat().resolvedOptions().timeZone
}

declare global {
  let hx: typeof hxHelpers
  interface Window {
    hx: typeof hxHelpers
  }
}

window.hx = hxHelpers
