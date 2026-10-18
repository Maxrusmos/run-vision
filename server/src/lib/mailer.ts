import nodemailer from 'nodemailer'

// Отправка писем. В проде — SMTP (SMTP_URL), без него (разработка) письмо пишется в лог:
// ссылку сброса пароля можно взять из консоли сервера. В тестах — свой Mailer в buildApp.

export interface Mail {
  to: string
  subject: string
  text: string
  html: string
}

export interface Mailer {
  send(mail: Mail): Promise<void>
}

export function createMailer(
  options: { smtpUrl: string; from: string },
  log: (message: string) => void,
): Mailer {
  if (!options.smtpUrl) {
    return {
      async send(mail) {
        log(`Письмо (SMTP не настроен) → ${mail.to}: ${mail.subject}\n${mail.text}`)
      },
    }
  }
  const transport = nodemailer.createTransport(options.smtpUrl)
  return {
    async send(mail) {
      await transport.sendMail({ from: options.from, ...mail })
    },
  }
}

/** Письмо в память — для тестов. */
export function createMemoryMailer(): Mailer & { sent: Mail[] } {
  const sent: Mail[] = []
  return {
    sent,
    async send(mail) {
      sent.push(mail)
    },
  }
}
