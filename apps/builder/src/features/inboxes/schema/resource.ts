export { inboxResource } from "@salesmanchatbot.io/business/inbox/schema"

import type {
  InboxModel,
  IntegrationInstagramModel,
  IntegrationMessengerModel,
  IntegrationSmtpModel,
  IntegrationTelegramModel,
  IntegrationWebchatModel,
  IntegrationWhatsappModel,
  IntegrationZaloModel,
} from "@salesmanchatbot.io/database/types"

export type InboxResource = InboxModel & {
  integrationWhatsapp?: IntegrationWhatsappModel
  integrationWebchat?: IntegrationWebchatModel
  integrationMessenger?: IntegrationMessengerModel
  integrationInstagram?: IntegrationInstagramModel
  integrationZalo?: IntegrationZaloModel
  integrationTelegram?: IntegrationTelegramModel
  integrationSmtp?: IntegrationSmtpModel
}
