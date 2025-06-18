import { config } from "@config"

export function EmailLink({ email }: { email: string }) {
  return <a class="link" href={`mailto:${email}`}>{email}</a>
}

export function SupportEmailLink() {
  return EmailLink({ email: config.contact.supportEmail })
}
