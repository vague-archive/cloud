// deno-lint-ignore-file no-window

import alpine from "npm:alpinejs@3.14.1"
import alpineFocus from "npm:@alpinejs/focus@3.14.1"
import htmx from "npm:htmx.org@2.0.1"

declare global {
  interface Window {
    alpine: typeof alpine
    htmx: typeof htmx
  }
}

window.alpine = alpine
window.htmx = htmx

htmx.config.defaultSwapStyle = "outerHTML"

alpine.plugin(alpineFocus)
alpine.start()
