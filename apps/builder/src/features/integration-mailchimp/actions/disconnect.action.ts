"use server"

import { integrationMailchimpService } from "@salesmanchatbot.io/business"
import { createDisconnectAction } from "@/lib/integration-actions"

export const disconnectMailchimpAction = createDisconnectAction(
  integrationMailchimpService,
  { name: "Mailchimp" },
)
