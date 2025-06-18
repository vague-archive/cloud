import { assert, Test, TestMailerConfig } from "@test"

//-------------------------------------------------------------------------------------------------

const PRODUCT_NAME = TestMailerConfig.productName
const PRODUCT_URL = TestMailerConfig.productUrl
const SUPPORT_EMAIL = TestMailerConfig.supportEmail
const TO = "user@recipient.com"
const NAME = "John Doe"

//-------------------------------------------------------------------------------------------------

Test.mailer("constructor", ({ mailer }) => {
  assert.equals(mailer.enabled, false, "disabled in test mode")
  assert.equals(mailer.pm, undefined, "no postmark client in test mode")
  assert.equals(mailer.from, SUPPORT_EMAIL, "expected support email to be default :from")
  assert.equals(mailer.layoutData, {
    product_name: PRODUCT_NAME,
    product_url: PRODUCT_URL,
    support_email: SUPPORT_EMAIL,
  })
  assert.equals(mailer.count(), 0)
  assert.equals(mailer.sent(), undefined)
})

//-------------------------------------------------------------------------------------------------

Test.mailer("example", async ({ mailer }) => {
  const mail = mailer.template("example", { to: TO, name: NAME })

  assert.equals(mail, {
    from: SUPPORT_EMAIL,
    to: TO,
    template: "example",
    data: {
      name: NAME,
      product_name: PRODUCT_NAME,
      product_url: PRODUCT_URL,
      support_email: SUPPORT_EMAIL,
    },
  })

  await mailer.deliver(mail)

  assert.equals(mailer.count(), 1)
  assert.mailed(mailer, "example", {
    to: TO,
    name: NAME,
  })

  assert.equals(mailer.count(), 0)
  assert.equals(mailer.sent(), undefined)
})

//-------------------------------------------------------------------------------------------------
