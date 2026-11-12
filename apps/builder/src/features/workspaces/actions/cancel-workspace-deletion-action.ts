"use server"

import { workspaceService } from "@salesmanchatbot.io/business"
import { salesmanChatbotException } from "@salesmanchatbot.io/business/errors"
import { getTranslations } from "next-intl/server"
import {
  type WorkspaceIdRequestParams,
  workspaceIdrequestParams,
} from "@/features/common/schema"
import { hasWorkspacePermission } from "@/lib/auth/permission-routes"
import { getCurrentUserAndTargetWorkspace } from "@/lib/auth/utils"
import { workspaceActionClientAllowExpired } from "@/lib/safe-action"

export const cancelWorkspaceDeletionAction = workspaceActionClientAllowExpired
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
          "You are not authorized to restore this workspace",
        )
      }

      const { permissions } =
        currentUserAndTargetWorkspace.targetWorkspaceMember
      if (!hasWorkspacePermission(permissions, "superAdmin")) {
        throw new salesmanChatbotException(
          "You need to be a super admin to restore this workspace",
        )
      }

      try {
        await workspaceService.cancelDeletion({
          id: workspaceId,
        })
      } catch (err) {
        if (
          err instanceof salesmanChatbotException &&
          err.code === "workspaceDeletionStarted"
        ) {
          const t = await getTranslations()
          throw new salesmanChatbotException(
            t("workspace.deletion.alreadyStarted"),
            err.code,
            err.httpStatusCode,
          )
        }
        throw err
      }
    },
  )
