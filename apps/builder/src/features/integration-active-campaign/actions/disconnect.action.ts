"use server"

import { integrationActiveCampaignService } from "@salesmanchatbot.io/business"
import { createDisconnectAction } from "@/lib/integration-actions"

export const disconnectActiveCampaignAction = createDisconnectAction(
  integrationActiveCampaignService,
  { name: "ActiveCampaign" },
)
