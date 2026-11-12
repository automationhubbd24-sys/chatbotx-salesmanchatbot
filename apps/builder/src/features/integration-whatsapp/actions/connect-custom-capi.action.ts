"use server"

import {
  integrationWhatsappService,
  metaConversionsService,
} from "@salesmanchatbot.io/business"
import { salesmanChatbotException } from "@salesmanchatbot.io/business/errors"
import { getDataset } from "@salesmanchatbot.io/integration-meta-conversions"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { getTranslations } from "next-intl/server"
import { z } from "zod"
import { surfaceCapiError } from "@/features/meta-conversions/lib/surface-capi-error"
import { assertWorkspaceSuperAdmin } from "@/lib/auth/assert-workspace-super-admin"
import { workspaceActionClient } from "@/lib/safe-action"

export const connectWhatsappCustomCapiAction = workspaceActionClient
  .inputSchema(
    z.object({
      datasetId: z.string().trim().min(1),
      accessToken: z.string().trim().min(1),
    }),
  )
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .action(
    async ({
      parsedInput,
      bindArgsParsedInputs: [workspaceId, integrationId],
    }: {
      parsedInput: { datasetId: string; accessToken: string }
      bindArgsParsedInputs: readonly [string, string]
    }) => {
      const t = await getTranslations("metaConversions.errors")
      await assertWorkspaceSuperAdmin(workspaceId)

      const integration = await integrationWhatsappService.findByIdForWorkspace(
        {
          id: integrationId,
          workspaceId,
        },
      )
      if (!integration) {
        throw new salesmanChatbotException(t("whatsappNotFound"))
      }

      try {
        await metaConversionsService.connectCustomCapi({
          channel: "whatsapp",
          integration,
          accessToken: parsedInput.accessToken,
          datasetId: parsedInput.datasetId,
          validate: getDataset,
        })
      } catch (error) {
        surfaceCapiError(error, t("invalidToken"))
      }

      return { success: true }
    },
  )
