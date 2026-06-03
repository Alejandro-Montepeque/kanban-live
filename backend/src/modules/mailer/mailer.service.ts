import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export interface SendEmailInput {
  to: string
  subject: string
  text: string
  html?: string
}

// In dev (RESEND_API_KEY unset) emails are logged to stdout instead of sent,
// so password recovery and email verification flows can be tested locally.
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name)

  constructor(private readonly config: ConfigService) {}

  async send(input: SendEmailInput): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY')
    if (!apiKey) {
      this.logToConsole(input)
      return
    }
    await this.sendViaResend(input, apiKey)
  }

  private logToConsole(input: SendEmailInput): void {
    const from = this.config.get<string>('MAIL_FROM') ?? 'kanban-live <no-reply@kanban.local>'
    const banner = '─'.repeat(60)
    this.logger.log(`\n${banner}\n[DEV MAIL]  ${from}  →  ${input.to}\nSubject: ${input.subject}\n${banner}\n${input.text}\n${banner}`)
  }

  private async sendViaResend(input: SendEmailInput, apiKey: string): Promise<void> {
    const from = this.config.get<string>('MAIL_FROM') ?? 'kanban-live <no-reply@kanban-live.app>'
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html ?? `<pre>${input.text}</pre>`,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      this.logger.error(`Resend send failed (${res.status}): ${body}`)
      throw new Error(`Email provider error: ${res.status}`)
    }
  }
}
