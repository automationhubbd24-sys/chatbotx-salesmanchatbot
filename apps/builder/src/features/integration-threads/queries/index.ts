import { integrationThreadsService } from "@salesmanchatbot.io/business"

export const listIntegrationThreads = async ({
  workspaceId,
}: {
  workspaceId: string
}) => integrationThreadsService.listByWorkspaceId({ workspaceId })
