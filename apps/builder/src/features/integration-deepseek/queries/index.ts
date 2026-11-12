import { integrationDeepSeekService } from "@salesmanchatbot.io/business"
import type { IntegrationDeepseekResource } from "../schema/resource"

export const findIntegrationDeepSeek = async ({
  workspaceId,
}: {
  workspaceId: string
}): Promise<IntegrationDeepseekResource | null> =>
  (await integrationDeepSeekService.findByWorkspaceId(workspaceId)) ?? null
