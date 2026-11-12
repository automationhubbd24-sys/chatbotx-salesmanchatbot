"use server"

import {
  instagramIntegrationService,
  platformCredentialService,
} from "@salesmanchatbot.io/business"
import { salesmanChatbotException } from "@salesmanchatbot.io/business/errors"
import type { WorkspaceModel } from "@salesmanchatbot.io/database/types"
import { generateAuthUrl as generateInstagramAuthUrl } from "@salesmanchatbot.io/integration-instagram"
import { generateAuthUrl as generateInstagramFacebookAuthUrl } from "@salesmanchatbot.io/integration-instagram-facebook"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { redirect } from "next/navigation"
import { getOriginUrlFromHeader } from "@/lib/domain"
import { resolveOwnerForWorkspace } from "@/lib/platform-credential-owner"
import { buildProviderCallbackUrl } from "@/lib/provider-origin"
import { workspaceActionClient } from "@/lib/safe-action"

/**
 * Start an OAuth reconnect for an existing Instagram integration. The row's
 * `type` decides which OAuth dialog to open: the direct Instagram login or the
 * Facebook login. `reconnectIntegrationId` in the OAuth state makes the
 * callback refresh this row's tokens instead of running the account-select
 * connect flow. Mirrors `connectFacebookAds`.
 */
export const reconnectInstagramAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .action(
    async ({
      bindArgsParsedInputs: [workspaceId, integrationId],
      ctx,
    }: {
      bindArgsParsedInputs: readonly [string, string]
      ctx: { workspace: WorkspaceModel }
    }) => {
      const integrationInstagram =
        await instagramIntegrationService.findByIdForWorkspace({
          id: integrationId,
          workspaceId,
        })
      if (!integrationInstagram) {
        throw new salesmanChatbotException("Integration Instagram not found")
      }

      const connectedWithFacebookLogin =
        integrationInstagram.type === "facebook"
      const instagramCredential =
        await platformCredentialService.resolveForOwner({
          ownerId: await resolveOwnerForWorkspace(ctx.workspace),
          type: connectedWithFacebookLogin ? "instagramFacebook" : "instagram",
        })
      if (!instagramCredential) {
        throw new salesmanChatbotException("Instagram App settings not found")
      }

      const redirectUrl = await buildProviderCallbackUrl(
        instagramCredential,
        connectedWithFacebookLogin
          ? "/integrations/instagram-facebook/callback"
          : "/integrations/instagram/callback",
      )
      const baseUrl = await getOriginUrlFromHeader()
      const referer = new URL(
        `/space/${workspaceId}/settings/channels?channel=instagram`,
        baseUrl,
      ).toString()

      const generateAuthUrl = connectedWithFacebookLogin
        ? generateInstagramFacebookAuthUrl
        : generateInstagramAuthUrl
      const authUrl = generateAuthUrl({
        clientId: instagramCredential.config.clientId,
        version: instagramCredential.config.version,
        redirectUrl,
        stateParams: {
          workspaceId,
          referer,
          reconnectIntegrationId: integrationId,
        },
      })

      return redirect(authUrl)
    },
  )
