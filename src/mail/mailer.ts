import { postmark } from "@deps"
import { assert } from "@lib"
import { logger, pp } from "@lib/logger"

//=================================================================================================
// TYPES
//=================================================================================================

interface LayoutData {
  product_name: string
  product_url: string
  support_email: string
}

// deno-lint-ignore no-explicit-any
type TemplateData = Record<string, any>

interface MailTemplate {
  from: string
  to: string
  template: string
  data: LayoutData & TemplateData
}

interface MailerOpts {
  enabled: boolean
  apiToken?: string
  productName: string
  productUrl: string
  supportEmail: string
}

interface TemplateOptions {
  from?: string
  to: string
}

const MAX_HISTORY = 10

//=================================================================================================
// MAILER CLASS
//=================================================================================================

class Mailer {
  readonly enabled: boolean
  readonly pm?: postmark.ServerClient
  readonly from: string
  readonly layoutData: LayoutData

  private readonly history: MailTemplate[] // used by test assertions

  //-----------------------------------------------------------------------------------------------

  constructor(opts: MailerOpts) {
    if (opts.enabled && opts.apiToken) {
      this.enabled = true
      this.pm = new postmark.ServerClient(opts.apiToken)
    } else {
      this.enabled = false
    }
    this.from = opts.supportEmail
    this.history = []
    this.layoutData = {
      product_name: opts.productName,
      product_url: opts.productUrl,
      support_email: opts.supportEmail,
    }
  }

  //-----------------------------------------------------------------------------------------------

  template<Data>(template: string, opts: TemplateOptions & Data) {
    let { from, to, ...data } = opts
    from = from ?? this.from
    assert.present(to)
    assert.present(template)
    return {
      from, to, template,
      data: {
        ...this.layoutData,
        ...data
      }
    }
  }

  //-----------------------------------------------------------------------------------------------

  async deliver(mail: MailTemplate) {
    if (this.enabled) {
      // TODO: enqueue this into a background worker
      await this.deliver_now(mail)
    } else {
      logger.info(`[MAIL DISABLED]\n${pp({ mail })}`)
      this.history.push(mail)
      if (this.history.length > MAX_HISTORY) {
        this.history.shift()
      }
    }
  }

  private async deliver_now(mail: MailTemplate) {
    assert.present(this.pm)
    try {
      const response = await this.pm.sendEmailWithTemplate({
        From: mail.from,
        To: mail.to,
        TemplateAlias: mail.template,
        TemplateModel: mail.data,
      })
      if (response.ErrorCode === 0) {
        const { ErrorCode: _ErrorCode, ...responseWithoutErrorCode } = response // strip ErrorCode to avoid triggering false papertrail alert
        logger.info(`[MAIL SENT]\n${pp(mail)}${pp(responseWithoutErrorCode)}`)
      } else {
        logger.info(`[MAIL ERROR]\n${pp(mail)}${pp(response)}`)
      }
    } catch (e) {
      const err = e as Error
      logger.error(`[MAIL ERROR] - ${err.message}\n${pp(mail)}${pp(err)}`)
    }
  }

  //-----------------------------------------------------------------------------------------------

  count() {
    return this.history.length
  }

  sent() {
    return this.history.shift()
  }
}

//=================================================================================================
// EXPORTS
//=================================================================================================

export {
  Mailer,
  type MailTemplate,
  type TemplateData as MailTemplateData,
  type LayoutData as MailLayoutData,
}
