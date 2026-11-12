"use server"

import {
  invitationService,
  isWorkspaceScheduledForDeletion,
  quotaEnforcementService,
  workspaceMemberService,
  workspaceService,
} from "@salesmanchatbot.io/business"
import { salesmanChatbotException } from "@salesmanchatbot.io/business/errors"
import { invalidateCacheByTags } from "@salesmanchatbot.io/redis"
import { createId } from "@salesmanchatbot.io/utils"
import { getTranslations } from "next-intl/server"
import { z } from "zod"
import { isCommunity } from "@/env"
import { getSuperAdminPermissions } from "@/features/workspace-members/helpers"
import { authActionClient } from "@/lib/safe-action"

export const acceptInvitationAction = authActionClient
  .inputSchema(
    z.object({
      code: z.string(),
    }),
  )
  .action(async ({ ctx, parsedInput }) => {
    const { code } = parsedInput

    const invitation = await invitationService.findByCodeOrFail(code)

    if (invitation.expiresAt < new Date()) {
      throw new salesmanChatbotException("Invitation expired")
    }

    if (!invitation.workspaceId) {
      throw new salesmanChatbotException("Invalid invitation: no workspace associated")
    }

    const existingMember =
      await workspaceMemberService.findByWorkspaceIdAndUserId({
        workspaceId: invitation.workspaceId,
        userId: ctx.user.id,
      })
    if (existingMember) {
      throw new salesmanChatbotException("You are already a member of this workspace")
    }

    const workspace = await workspaceService.find({
      where: { id: invitation.workspaceId },
    })
    if (workspace && isWorkspaceScheduledForDeletion(workspace)) {
      const t = await getTranslations("invitation")
      throw new salesmanChatbotException(
        t("workspaceUnavailable"),
        "workspaceScheduledDeletion",
        403,
      )
    }
    if (workspace) {
      const atLimit = await quotaEnforcementService.hasReachedLimit({
        userId: workspace.ownerId,
        metric: "teamMembers",
      })
      if (atLimit) {
        throw new salesmanChatbotException(
          "Team member limit reached for this workspace plan",
        )
      }
    }

    // Defense in depth: even though invite-time normalization is the source of
    // truth, re-force full super-admin permissions for community here so a row
    // written by any other path can't grant a restricted community member.
    const permissions = isCommunity()
      ? getSuperAdminPermissions()
      : invitation.permissions

    await workspaceMemberService.create({
      data: {
        id: createId(),
        workspaceId: invitation.workspaceId,
        userId: ctx.user.id,
        role: "agent",
        permissions,
        notificationTypes: {
          notifyAdmin: true,
          newMessageToHuman: true,
          newOrder: true,
        },
        notificationChannels: {
          messenger: true,
          email: true,
          telegram: true,
          browser: true,
        },
      },
    })

    // The new membership must show up in the invitee's cached workspace list
    // right away; bust the tag so the workspace becomes reachable immediately.
    // Also bust the workspace-side member list so existing admins see the new
    // member without waiting for that cache's TTL to expire.
    await invalidateCacheByTags([
      `users:${ctx.user.id}:workspace-members`,
      `workspaces:${invitation.workspaceId}:workspace-members`,
    ])
  })
