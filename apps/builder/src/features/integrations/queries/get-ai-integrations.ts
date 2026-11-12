import { aiProviders } from "@salesmanchatbot.io/ai"
import {
  integrationOpenaiCompatibleService,
  integrationService,
} from "@salesmanchatbot.io/business"

export async function hasAIIntegration(workspaceId: string): Promise<boolean> {
  const [hasBuiltInAIIntegration, openaiCompatibleIntegrations] =
    await Promise.all([
      integrationService.hasIntegrationOfTypes({
        workspaceId,
        integrationTypes: [...aiProviders.options],
      }),
      integrationOpenaiCompatibleService.listByWorkspaceId(workspaceId),
    ])

  return (
    hasBuiltInAIIntegration ||
    openaiCompatibleIntegrations.some((integration) => integration.enabled)
  )
}
