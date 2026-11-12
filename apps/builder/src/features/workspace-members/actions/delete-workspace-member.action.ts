"use server"

import {
  revokeWorkspaceMemberConnections,
  workspaceMemberCacheTag,
  workspaceMemberService,
} from "@salesmanchatbot.io/business"
import { salesmanChatbotException } from "@salesmanchatbot.io/business/errors"
import { findOrFail } from "@salesmanchatbot.io/database/client"
import { workspaceMemberModel } from "@salesmanchatbot.io/database/schema"
import { invalidateCacheByTags } from "@salesmanchatbot.io/redis"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { hasWorkspacePermission } from "@/lib/auth/permission-routes"
import { getCurrentUserAndTargetWorkspace } from "@/lib/auth/utils"
import { workspaceActionClientAllowExpired } from "@/lib/safe-action"

export const deleteWorkspaceMemberAction = workspaceActionClientAllowExpired
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .action(async (props) => {
    const {
      bindArgsParsedInputs: [workspaceId, id],
    } = props

    const workspaceMember = await findOrFail({
      table: workspaceMemberModel,
      where: { id, workspaceId },
      message: "Workspace member not found",
    })

    if (workspaceMember.role === "owner") {
      throw new salesmanChatbotException(
        "You cannot delete the owner of the workspace",
      )
    }

    const currentUserAndTargetChatbot =
      await getCurrentUserAndTargetWorkspace(workspaceId)
    if (!currentUserAndTargetChatbot) {
      throw new salesmanChatbotException(
        "You are not authorized to delete this workspace member",
      )
    }

    const permissions =
      currentUserAndTargetChatbot.targetWorkspaceMember.permissions
    if (!hasWorkspacePermission(permissions, "superAdmin")) {
      throw new salesmanChatbotException(
        "You are not authorized to delete this workspace member. You need to be a super admin to do this.",
      )
    }

    await workspaceMemberService.delete({ id, workspaceId })

    // The removed member's cached `listByUserId` result still lists this
    // workspace; bust it so their access is revoked immediately.
    await invalidateCacheByTags([
      workspaceMemberCacheTag(workspaceMember.userId),
    ])

    // Close any realtime sockets the removed member already has open in
    // this workspace room — their next connect attempt is rejected anyway
    // (the mint endpoint re-checks membership), but an existing socket
    // would otherwise keep receiving events until it happens to reconnect.
    // Best-effort: `revokeWorkspaceMemberConnections` swallows its own
    // network failures, so this never blocks the deletion.
    await revokeWorkspaceMemberConnections({
      workspaceId,
      userId: workspaceMember.userId,
    })
  })
