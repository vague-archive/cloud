import { tailwind } from "@deps"

import preset from "@vaguevoid/design-system/preset"

export default {
  presets: [
    preset as unknown as tailwind.Config,
  ],
  content: [
    "src/**/*.{ts,tsx}",
  ],
  plugins: [],
  safelist: [
    ...preset.safelist,
  ],
} satisfies tailwind.Config
