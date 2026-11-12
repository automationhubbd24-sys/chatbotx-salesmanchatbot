import { salesmanChatbotException } from "@salesmanchatbot.io/business/errors"
import { smtpHostMap } from "@salesmanchatbot.io/integration-smtp"
import { createSmtpTransporter } from "@salesmanchatbot.io/mail/transport"
import { getTranslations } from "next-intl/server"
import type { CreateSmtpRequest } from "../schema/mutation"

export async function verifySmtpConnection(input: CreateSmtpRequest) {
  const t = await getTranslations()

  const { host, port } =
    input.provider === "other"
      ? { host: input.host, port: input.port }
      : smtpHostMap[input.provider]

  const transporter = createSmtpTransporter({
    host,
    port,
    username: input.username,
    password: input.password,
  })

  try {
    await transporter.verify()
  } catch {
    throw new salesmanChatbotException(t("smtp.errors.connectionFailed"))
  } finally {
    transporter.close()
  }
}
