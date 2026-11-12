"use server"

import {
  instagramIntegrationService,
  metaConversionsService,
} from "@salesmanchatbot.io/business"
import { salesmanChatbotException } from "@salesmanchatbot.io/business/errors"
import { getDataset } from "@salesmanchatbot.io/integration-meta-conversions"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { getTranslations } from "next-intl/server"
import { z } from "zod"
import { assertWorkspaceSuperAdmin } from "@/lib/auth/assert-workspace-super-admin"
import { workspaceActionClient } from "@/lib/safe-action"

export const connectInstagramCustomCapiAction = workspaceActionClient
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

      const integration =
        await instagramIntegrationService.findByIdForWorkspace({
          id: integrationId,
          workspaceId,
        })
      if (integration?.type !== "facebook") {
        throw new salesmanChatbotException(t("instagramNotFound"))
      }

      try {
        await metaConversionsService.connectCustomCapi({
          channel: "instagram",
          integration,
          accessToken: parsedInput.accessToken,
          datasetId: parsedInput.datasetId,
          validate: getDataset,
        })
      } catch {
        throw new salesmanChatbotException(t("invalidToken"))
      }

      return { success: true }
    },
  )
