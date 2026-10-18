// Тексты писем. Только по делу: рассылок сервис не делает.

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

export function buildPasswordResetMail(link: string, ttlMinutes: number) {
  const subject = 'RunVision: смена пароля'
  const text = [
    'Здравствуйте!',
    '',
    'Кто-то (надеемся, вы) попросил сменить пароль в RunVision. Чтобы задать новый пароль,',
    `откройте ссылку — она действует ${ttlMinutes} минут и сработает один раз:`,
    '',
    link,
    '',
    'Если вы не просили смену пароля, просто не открывайте ссылку — пароль останется прежним.',
  ].join('\n')
  const safeLink = escapeHtml(link)
  const html = `<p>Здравствуйте!</p>
<p>Кто-то (надеемся, вы) попросил сменить пароль в RunVision.</p>
<p><a href="${safeLink}">Задать новый пароль</a></p>
<p>Ссылка действует ${ttlMinutes} минут и сработает один раз.</p>
<p style="color:#777">Если вы не просили смену пароля, просто не открывайте ссылку — пароль останется прежним.</p>`
  return { subject, text, html }
}
