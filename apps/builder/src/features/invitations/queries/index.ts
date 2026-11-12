"use server"

import { workspaceService } from "@salesmanchatbot.io/business"
import { salesmanChatbotException } from "@salesmanchatbot.io/business/errors"
import { findOrFail } from "@salesmanchatbot.io/database/client"
import { invitationModel, userModel } from "@salesmanchatbot.io/database/schema"
import type { WorkspaceModel } from "@salesmanchatbot.io/database/types"

export async function findInvitation({ code }: { code: string }) {
  const invitation = await findOrFail({
    table: invitationModel,
    where: {
      code,
    },
    message: "Invitation not found",
  })
  if (invitation.expiresAt < new Date()) {
    throw new salesmanChatbotException("Invitation expired")
  }

  const user = await findOrFail({
    table: userModel,
    where: {
      id: invitation.invitedBy,
    },
    message: "User not found",
  })

  let workspace: WorkspaceModel | null = null
  if (invitation.workspaceId) {
    workspace =
      (await workspaceService.find({
        where: { id: invitation.workspaceId },
      })) ?? null
  }

  return {
    invitation,
    user,
    workspace,
  }
}
