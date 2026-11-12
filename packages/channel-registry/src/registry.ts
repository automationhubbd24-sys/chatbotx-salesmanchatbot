import {
  buildContext,
  type IntegrationContext,
  inboxService,
  integrationThreadsService,
  workspaceService,
} from "@salesmanchatbot.io/business"
import { findOrFail } from "@salesmanchatbot.io/database/client"
import type { IntegrationType } from "@salesmanchatbot.io/database/partials"
import { integrationLookupRepository } from "@salesmanchatbot.io/database/repositories"
import { inboxModel } from "@salesmanchatbot.io/database/schema"
import type {
  ContactInboxModel,
  InboxModel,
  WorkspaceModel,
} from "@salesmanchatbot.io/database/types"
import { integration as integrationActiveCampaign } from "@salesmanchatbot.io/integration-active-campaign"
import { integration as integrationApi } from "@salesmanchatbot.io/integration-api"
import { integration as integrationChatbotx } from "@salesmanchatbot.io/integration-salesmanchatbot"
import { integration as integrationDrip } from "@salesmanchatbot.io/integration-drip"
import { integration as integrationFacebookAds } from "@salesmanchatbot.io/integration-facebook-ads"
import { integration as integrationGetResponse } from "@salesmanchatbot.io/integration-get-response"
import { integration as integrationGoogleCalendar } from "@salesmanchatbot.io/integration-google-calendar"
import { integration as integrationGoogleSheets } from "@salesmanchatbot.io/integration-google-sheets"
import { integration as integrationInstagram } from "@salesmanchatbot.io/integration-instagram"
import { integration as integrationInstagramFacebook } from "@salesmanchatbot.io/integration-instagram-facebook"
import { integration as integrationKlaviyo } from "@salesmanchatbot.io/integration-klaviyo"
import { integration as integrationMailchimp } from "@salesmanchatbot.io/integration-mailchimp"
import { integration as integrationMailerLite } from "@salesmanchatbot.io/integration-mailer-lite"
import { integration as integrationMessenger } from "@salesmanchatbot.io/integration-messenger"
import { integration as integrationMoosend } from "@salesmanchatbot.io/integration-moosend"
import { integration as integrationSendGrid } from "@salesmanchatbot.io/integration-sendgrid"
import { integration as integrationSmtp } from "@salesmanchatbot.io/integration-smtp"
import { integration as integrationTelegram } from "@salesmanchatbot.io/integration-telegram"
import { integration as integrationThreads } from "@salesmanchatbot.io/integration-threads"
import { integration as integrationTiktok } from "@salesmanchatbot.io/integration-tiktok"
import { integration as integrationWebchat } from "@salesmanchatbot.io/integration-webchat"
import { integration as integrationWhatsapp } from "@salesmanchatbot.io/integration-whatsapp"
import { integration as integrationZalo } from "@salesmanchatbot.io/integration-zalo"
import {
  type AuthValue,
  type BaseConfig,
  ChannelError,
  ChannelErrorCategory,
  type Integration,
  type IntegrationDefinition,
  SdkException,
} from "@salesmanchatbot.io/sdk"
import { IntegrationNotFoundError } from "./errors"

export { IntegrationNotFoundError } from "./errors"

export const integrations = {
  activeCampaign: integrationActiveCampaign,
  api: integrationApi,
  salesmanchatbot: integrationChatbotx,
  drip: integrationDrip,
  facebookAds: integrationFacebookAds,
  getResponse: integrationGetResponse,
  googleCalendar: integrationGoogleCalendar,
  googleSheets: integrationGoogleSheets,
  instagram: integrationInstagram,
  instagramFacebook: integrationInstagramFacebook,
  klaviyo: integrationKlaviyo,
  mailchimp: integrationMailchimp,
  mailerLite: integrationMailerLite,
  messenger: integrationMessenger,
  moosend: integrationMoosend,
  sendGrid: integrationSendGrid,
  smtp: integrationSmtp,
  telegram: integrationTelegram,
  threads: integrationThreads,
  tiktok: integrationTiktok,
  webchat: integrationWebchat,
  whatsapp: integrationWhatsapp,
  zalo: integrationZalo,
} as const

export type IntegrationKey = keyof typeof integrations

export type ResolvedIntegration = Integration<
  IntegrationDefinition<BaseConfig, AuthValue>
>

const registeredIntegrations = {
  ...integrations,
  gemini: undefined,
  openai: undefined,
}

export const allIntegrations = registeredIntegrations as unknown as Record<
  string,
  ResolvedIntegration | undefined
> &
  Pick<typeof registeredIntegrations, "messenger" | "threads">

export const getRegisteredIntegration = (
  integrationType: string,
): ResolvedIntegration | undefined => allIntegrations[integrationType]

export type IntegrationRow = {
  id: string
  auth: AuthValue
  inboxId: string
  type?: string
  [key: string]: unknown
}

export function isInstagramViaFacebook(row: IntegrationRow): boolean {
  return row.type === "facebook"
}

export const integrationService = {
  identifyInboxAndIntegrationAuthFromIdentifier: async (
    integrationType: IntegrationType,
    integrationIdentifier: string,
  ): Promise<{
    workspace: WorkspaceModel
    inbox: InboxModel
    integrationRow: IntegrationRow
  }> => {
    if (integrationType === "threads") {
      const integrationRow =
        await integrationThreadsService.findByThreadsUserId(
          integrationIdentifier,
        )

      if (!integrationRow) {
        throw new IntegrationNotFoundError(
          integrationType,
          integrationIdentifier,
        )
      }

      const [workspace, inbox] = await Promise.all([
        workspaceService.findById({ id: integrationRow.workspaceId }),
        inboxService.find({ where: { id: integrationRow.inboxId } }),
      ])

      if (!inbox) {
        throw new IntegrationNotFoundError(
          integrationType,
          integrationIdentifier,
        )
      }

      return {
        integrationRow: {
          ...integrationRow,
          auth: integrationRow.auth as AuthValue,
        },
        workspace,
        inbox,
      }
    }

    let modelName: string
    let columnName: string

    switch (integrationType) {
      case "whatsapp": {
        modelName = "IntegrationWhatsapp"
        columnName = "phoneNumberId"
        break
      }
      case "telegram": {
        modelName = "IntegrationTelegram"
        columnName = "botId"
        break
      }
      case "messenger": {
        modelName = "IntegrationMessenger"
        columnName = "pageId"
        break
      }
      case "zalo": {
        modelName = "IntegrationZalo"
        columnName = "oaId"
        break
      }
      case "instagram":
      case "instagramFacebook": {
        modelName = "IntegrationInstagram"
        columnName = "igId"
        break
      }
      case "tiktok": {
        modelName = "IntegrationTiktok"
        columnName = "openId"
        break
      }
      case "webchat": {
        modelName = "IntegrationWebchat"
        columnName = "inboxId"
        break
      }
      case "api": {
        modelName = "IntegrationApi"
        columnName = "inboxId"
        break
      }
      default:
        throw new Error(`Unsupported integration: ${integrationType}`)
    }

    const row = await integrationLookupRepository.findAuthByIdentifier({
      modelName,
      columnName,
      identifier: integrationIdentifier,
    })

    if (!row) {
      throw new IntegrationNotFoundError(integrationType, integrationIdentifier)
    }

    const integrationRow = row as IntegrationRow & { workspaceId: string }
    const workspace = await workspaceService.findById({
      id: integrationRow.workspaceId,
    })
    const inbox = await findOrFail({
      table: inboxModel,
      where: { id: integrationRow.inboxId },
      message: "Inbox not found",
    })

    return { integrationRow, workspace, inbox }
  },

  getIntegrationFromContactInbox: async (
    contactInbox: ContactInboxRoute,
  ): Promise<IntegrationRow> => {
    if (contactInbox.channel === "threads") {
      const integrationRow = await integrationThreadsService.findByInboxId(
        contactInbox.inboxId,
      )

      if (!integrationRow) {
        throw new ChannelError(
          `Unable to find integration auth for channel: ${contactInbox.channel}`,
          ChannelErrorCategory.AUTH_FAILED,
          { code: "integration_auth_missing" },
        )
      }

      return {
        ...integrationRow,
        auth: integrationRow.auth as AuthValue,
      }
    }

    const integrationTableByChannel: Partial<Record<string, string>> = {
      api: "IntegrationApi",
      instagram: "IntegrationInstagram",
      messenger: "IntegrationMessenger",
      smtp: "IntegrationSmtp",
      telegram: "IntegrationTelegram",
      tiktok: "IntegrationTiktok",
      webchat: "IntegrationWebchat",
      whatsapp: "IntegrationWhatsapp",
      zalo: "IntegrationZalo",
    }
    const integrationTable = integrationTableByChannel[contactInbox.channel]
    if (!integrationTable) {
      throw new ChannelError(
        `Unsupported integration channel: ${contactInbox.channel}`,
        ChannelErrorCategory.AUTH_FAILED,
        { code: "unsupported_channel" },
      )
    }

    const row = await integrationLookupRepository.findAuthByInboxId({
      modelName: integrationTable,
      inboxId: contactInbox.inboxId,
    })

    if (!row) {
      throw new ChannelError(
        `Unable to find integration auth for channel: ${contactInbox.channel}`,
        ChannelErrorCategory.AUTH_FAILED,
        { code: "integration_auth_missing" },
      )
    }

    return row as IntegrationRow
  },
}

/** What locates a contact's integration: its channel and inbox, nothing else. */
export type ContactInboxRoute = Pick<ContactInboxModel, "channel" | "inboxId">

export type ResolvedIntegrationContext = {
  integration: ResolvedIntegration
  ctx: IntegrationContext
  integrationRow: Awaited<
    ReturnType<typeof integrationService.getIntegrationFromContactInbox>
  >
}

export async function resolveIntegrationContextFromContactInbox(args: {
  workspaceId: string
  contactInbox: ContactInboxRoute
}): Promise<ResolvedIntegrationContext> {
  let integration = getRegisteredIntegration(args.contactInbox.channel)
  if (!integration) {
    throw new SdkException(
      `No integration registered for channel: ${args.contactInbox.channel}`,
    )
  }

  const integrationRow =
    await integrationService.getIntegrationFromContactInbox(args.contactInbox)

  if (
    args.contactInbox.channel === "instagram" &&
    isInstagramViaFacebook(integrationRow)
  ) {
    integration = getRegisteredIntegration("instagramFacebook") ?? integration
  }

  return {
    integration,
    integrationRow,
    ctx: await buildContext({
      workspaceId: args.workspaceId,
      integrationType: args.contactInbox.channel,
      integration: integrationRow,
    }),
  }
}
