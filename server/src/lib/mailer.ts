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
        // Отдельным блоком в консоль, а не строкой JSON-лога: там перевод строк — «\n»,
        // и ссылку было не найти (было).
        const line = '─'.repeat(60)
        log(`Письмо не отправлено: SMTP_URL не задан. Текст — в консоли сервера (${mail.to}).`)
        console.log(
          `\n${line}\nПИСЬМО (SMTP не настроен, не отправлено)\nКому: ${mail.to}\nТема: ${mail.subject}\n\n${mail.text}\n${line}\n`,
        )
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
