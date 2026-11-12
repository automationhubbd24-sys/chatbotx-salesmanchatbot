"use server"

import {
  workspaceLifecycleService,
  workspaceService,
} from "@salesmanchatbot.io/business"
import { salesmanChatbotException } from "@salesmanchatbot.io/business/errors"
import {
  type WorkspaceIdRequestParams,
  workspaceIdrequestParams,
} from "@/features/common/schema"
import { hasWorkspacePermission } from "@/lib/auth/permission-routes"
import { getCurrentUserAndTargetWorkspace } from "@/lib/auth/utils"
import { workspaceActionClientAllowExpired } from "@/lib/safe-action"

export const scheduleWorkspaceDeletionAction = workspaceActionClientAllowExpired
  .bindArgsSchemas(workspaceIdrequestParams)
  .action(
    async ({
      bindArgsParsedInputs: [workspaceId],
    }: {
      bindArgsParsedInputs: WorkspaceIdRequestParams
    }) => {
      const currentUserAndTargetWorkspace =
        await getCurrentUserAndTargetWorkspace(workspaceId)
      if (!currentUserAndTargetWorkspace) {
        throw new salesmanChatbotException(
          "You are not authorized to delete this workspace",
        )
      }

      const { permissions } =
        currentUserAndTargetWorkspace.targetWorkspaceMember
      if (!hasWorkspacePermission(permissions, "superAdmin")) {
        throw new salesmanChatbotException(
          "You need to be a super admin to delete this workspace",
        )
      }

      await workspaceService.scheduleDeletion({
        id: workspaceId,
      })

      await workspaceLifecycleService.freezeWorkspaceRuntime(workspaceId)
    },
  )
