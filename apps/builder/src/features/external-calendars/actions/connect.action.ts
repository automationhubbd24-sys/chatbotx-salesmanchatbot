"use server"

import { platformCredentialService } from "@salesmanchatbot.io/business"
import { salesmanChatbotException } from "@salesmanchatbot.io/business/errors"
import type { UserModel, WorkspaceModel } from "@salesmanchatbot.io/database/types"
import { HandleRequestType } from "@salesmanchatbot.io/sdk"
import { redirect } from "next/navigation"
import { workspaceIdrequestParams } from "@/features/common/schema"
import { integrations } from "@/integration"
import { getOriginUrlFromHeader } from "@/lib/domain"
import { resolvePlatformOwnerId } from "@/lib/platform-credential-owner"
import { buildProviderCallbackUrl } from "@/lib/provider-origin"
import { workspaceActionClient } from "@/lib/safe-action"
import { connectExternalCalendarRequest } from "../schema/action"

export const connectGoogleCalendarAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(connectExternalCalendarRequest)
  .action(
    async ({
      ctx,
      parsedInput,
    }: {
      ctx: {
        user: UserModel
        workspace: WorkspaceModel
      }
      parsedInput: { referer: string }
    }) => {
      const ownerId = await resolvePlatformOwnerId({
        userId: ctx.user.id,
        workspaceId: ctx.workspace.id,
      })
      const googleCredential = await platformCredentialService.resolveForOwner({
        ownerId,
        type: "google",
      })
      if (!googleCredential) {
        throw new salesmanChatbotException("Google App settings is not valid")
      }

      const originUrl = await getOriginUrlFromHeader()
      const authUrl = await integrations.googleCalendar.handleRequest?.({
        config: {
          ...googleCredential.config,
          redirectUrl: await buildProviderCallbackUrl(
            googleCredential,
            "/integrations/google-calendar/callback",
          ),
          stateParams: {
            workspaceId: ctx.workspace.id,
            referer: parsedInput.referer,
          },
        },
        req: new Request(new URL(HandleRequestType.generateAuthUrl, originUrl)),
      })

      if (typeof authUrl !== "string") {
        throw new salesmanChatbotException("Failed to connect Google Calendar")
      }

      return redirect(authUrl)
    },
  )
