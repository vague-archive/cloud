import { highlight } from "@deps"
import { cls } from "@lib/html"

const theme = "border border-gray-200 bg-white"

export function CodeBlock({
  code,
  language,
  className,
}: {
  code: string
  language?: string
  className?: string
}) {
  const html = highlight.highlight(code, {
    language: language ?? "bash",
  }).value
  return (
    <pre className={cls("block p-4 overflow-auto", theme, className)}>
      <code className="block unstyled" dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  )
}
