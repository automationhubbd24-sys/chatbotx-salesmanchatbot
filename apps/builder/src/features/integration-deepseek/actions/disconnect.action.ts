"use server"

import { aiProviders } from "@salesmanchatbot.io/ai"
import { aiIntegrationService } from "@salesmanchatbot.io/ai/server"
import { integrationDeepSeekService } from "@salesmanchatbot.io/business"
import { createDisconnectAction } from "@/lib/integration-actions"

export const disconnectDeepSeekAction = createDisconnectAction(
  integrationDeepSeekService,
  {
    name: "DeepSeek",
    log: false,
    afterDisconnect: async (workspaceId) => {
      await aiIntegrationService.invalidateCache(
        workspaceId,
        aiProviders.enum.deepseek,
      )
    },
  },
)
