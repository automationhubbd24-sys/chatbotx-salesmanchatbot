"use server"

import { integrationOpenaiCompatibleEmbeddingService } from "@chatbotx.io/business"
import {
  type WorkspaceIdRequestParams,
  workspaceIdrequestParams,
} from "@/features/common/schema"
import { hasWorkspacePermission } from "@/lib/auth/permission-routes"
import { workspaceActionClient } from "@/lib/safe-action"

export const disconnectOpenaiCompatibleEmbeddingAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdrequestParams)
  .action(
    async ({
      bindArgsParsedInputs: [workspaceId],
      ctx,
    }: {
      bindArgsParsedInputs: WorkspaceIdRequestParams
      ctx: { workspaceMemberPermissions: Parameters<typeof hasWorkspacePermission>[0] }
    }) => {
      if (!hasWorkspacePermission(ctx.workspaceMemberPermissions, "superAdmin")) {
        throw new Error(
          "You need to be a super admin to manage text embedding integrations",
        )
      }

      await integrationOpenaiCompatibleEmbeddingService.disconnect(workspaceId)
    },
  )
