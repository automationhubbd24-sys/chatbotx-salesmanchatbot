import {
  coexistService,
  instagramIntegrationService,
  messengerIntegrationService,
  workspaceService,
} from "@salesmanchatbot.io/business"
import { auditService } from "@salesmanchatbot.io/business/audit"
import { connectionStateService } from "@salesmanchatbot.io/business/connection"
import { db } from "@salesmanchatbot.io/database/client"
import { metaCapiEventRepository } from "@salesmanchatbot.io/database/repositories"
import {
  type InstagramAuthValue,
  isRevokedTokenError,
} from "@salesmanchatbot.io/integration-instagram"
import { isRevokedTokenError as isRevokedTokenErrorFacebook } from "@salesmanchatbot.io/integration-instagram-facebook"
import { integrations } from "@/integration"
import { logger } from "@/lib/log"

export const disconnectInstagram = async (ctx: {
  workspaceId: string
  integrationInstagramId: string
}) => {
  const [integrationInstagram, workspace] = await Promise.all([
    instagramIntegrationService.findByIdForWorkspace({
      id: ctx.integrationInstagramId,
      workspaceId: ctx.workspaceId,
    }),
    workspaceService.findById({ id: ctx.workspaceId }),
  ])

  if (!integrationInstagram) {
    throw new Error("Integration Instagram not found")
  }

  const authValue = integrationInstagram.auth as InstagramAuthValue
  const isFacebook = integrationInstagram.type === "facebook"

  try {
    if (isFacebook) {
      const hasMessengerSibling =
        await messengerIntegrationService.existsForPage({
          pageId: authValue.metadata.pageId,
          clientId: authValue.clientId,
        })

      if (!hasMessengerSibling) {
        await integrations.instagramFacebook.disconnect(authValue)
      }
    } else {
      await integrations.instagram.disconnect(authValue)
    }
  } catch (error) {
    logger.warn(
      {
        err: error instanceof Error ? error.message : String(error),
      },
      "Instagram disconnect API call failed — proceeding with local cleanup",
    )

    const isRevoked = isFacebook
      ? isRevokedTokenErrorFacebook(error)
      : isRevokedTokenError(error)

    if (!isRevoked) {
      throw error
    }
  }

  await db.transaction(async (tx) => {
    // Coexist only exists for the native Instagram integration; the Facebook-
    // mediated variant (type "facebook") never has coexist runs. Gate explicitly
    // so the intent is clear at the call site (mirrors workspace-lifecycle).
    if (!isFacebook) {
      await coexistService.tearDownForIntegration({
        workspaceId: ctx.workspaceId,
        integrationId: integrationInstagram.id,
        channel: "instagram",
        currentError: "Integration disconnected",
        tx,
      })
    }

    // Polymorphic FK cleanup — stale MetaCapiEvent rows would keep occupying
    // the (workspaceId, channel, sourceKey) dedup slot after a reconnect.
    await metaCapiEventRepository.deleteByIntegration(
      {
        workspaceId: ctx.workspaceId,
        channel: "instagram",
        integrationId: integrationInstagram.id,
      },
      tx,
    )

    await instagramIntegrationService.disconnect({
      id: integrationInstagram.id,
      tx,
    })

    await connectionStateService.disconnectInbox({
      inboxId: integrationInstagram.inboxId,
      ownerId: workspace.ownerId,
      workspaceId: ctx.workspaceId,
      tx,
    })
  })

  await auditService.record({
    workspaceId: ctx.workspaceId,
    action: "disconnect",
    detail: `disconnected the Instagram channel (#${integrationInstagram.id})`,
  })
}
