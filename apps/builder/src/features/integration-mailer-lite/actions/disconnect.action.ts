"use server"

import { integrationMailerLiteService } from "@salesmanchatbot.io/business"
import { createDisconnectAction } from "@/lib/integration-actions"

export const disconnectMailerLiteAction = createDisconnectAction(
  integrationMailerLiteService,
  { name: "MailerLite" },
)
