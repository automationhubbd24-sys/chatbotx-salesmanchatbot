"use server"

import { aiProviders } from "@salesmanchatbot.io/ai"
import { aiIntegrationService } from "@salesmanchatbot.io/ai/server"
import { integrationOpenRouterService } from "@salesmanchatbot.io/business"
import { createDisconnectAction } from "@/lib/integration-actions"

export const disconnectOpenRouterAction = createDisconnectAction(
  integrationOpenRouterService,
  {
    name: "OpenRouter",
    log: false,
    afterDisconnect: async (workspaceId) => {
      await aiIntegrationService.invalidateCache(
        workspaceId,
        aiProviders.enum.openrouter,
      )
    },
  },
)
