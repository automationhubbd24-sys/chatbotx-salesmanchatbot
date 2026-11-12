"use server"

import { integrationKlaviyoService } from "@salesmanchatbot.io/business"
import { createDisconnectAction } from "@/lib/integration-actions"

export const disconnectKlaviyoAction = createDisconnectAction(
  integrationKlaviyoService,
  { name: "Klaviyo" },
)
