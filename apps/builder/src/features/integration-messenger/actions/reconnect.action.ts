"use server"

import {
  messengerIntegrationService,
  platformCredentialService,
} from "@salesmanchatbot.io/business"
import { salesmanChatbotException } from "@salesmanchatbot.io/business/errors"
import type { WorkspaceModel } from "@salesmanchatbot.io/database/types"
import { generateAuthUrl } from "@salesmanchatbot.io/integration-messenger"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { redirect } from "next/navigation"
import { getOriginUrlFromHeader } from "@/lib/domain"
import { resolveOwnerForWorkspace } from "@/lib/platform-credential-owner"
import { buildProviderCallbackUrl } from "@/lib/provider-origin"
import { workspaceActionClient } from "@/lib/safe-action"

/**
 * Start an OAuth reconnect for an existing Messenger integration: send the
 * user back through the Facebook dialog with `reconnectIntegrationId` in the
 * OAuth state so the callback refreshes this row's tokens instead of running
 * the page-select connect flow. Mirrors `connectFacebookAds`.
 */
export const reconnectMessengerAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .action(
    async ({
      bindArgsParsedInputs: [workspaceId, integrationId],
      ctx,
    }: {
      bindArgsParsedInputs: readonly [string, string]
      ctx: { workspace: WorkspaceModel }
    }) => {
      const integrationMessenger =
        await messengerIntegrationService.findByIdForWorkspace({
          id: integrationId,
          workspaceId,
        })
      if (!integrationMessenger) {
        throw new salesmanChatbotException("Integration Messenger not found")
      }

      const messengerCredential =
        await platformCredentialService.resolveForOwner({
          ownerId: await resolveOwnerForWorkspace(ctx.workspace),
          type: "messenger",
        })
      if (!messengerCredential) {
        throw new salesmanChatbotException("Messenger App settings not found")
      }

      const redirectUrl = await buildProviderCallbackUrl(
        messengerCredential,
        "/integrations/messenger/callback",
      )
      const baseUrl = await getOriginUrlFromHeader()
      const referer = new URL(
        `/space/${workspaceId}/settings/channels?channel=messenger`,
        baseUrl,
      ).toString()

      const authUrl = generateAuthUrl({
        clientId: messengerCredential.config.clientId,
        version: messengerCredential.config.version,
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
