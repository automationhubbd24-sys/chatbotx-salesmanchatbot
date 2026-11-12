"use server"

import { aiProviders } from "@salesmanchatbot.io/ai"
import { aiIntegrationService } from "@salesmanchatbot.io/ai/server"
import { integrationGeminiService } from "@salesmanchatbot.io/business"
import { createDisconnectAction } from "@/lib/integration-actions"

export const disconnectGeminiAction = createDisconnectAction(
  integrationGeminiService,
  {
    name: "Gemini",
    log: false,
    afterDisconnect: async (workspaceId) => {
      await aiIntegrationService.invalidateCache(
        workspaceId,
        aiProviders.enum.gemini,
      )
    },
  },
)
