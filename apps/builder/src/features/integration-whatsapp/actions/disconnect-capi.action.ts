"use server"

import {
  integrationWhatsappService,
  metaConversionsService,
} from "@salesmanchatbot.io/business"
import { salesmanChatbotException } from "@salesmanchatbot.io/business/errors"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { getTranslations } from "next-intl/server"
import { assertWorkspaceSuperAdmin } from "@/lib/auth/assert-workspace-super-admin"
import { workspaceActionClientAllowExpired } from "@/lib/safe-action"

export const disconnectWhatsappCapiAction = workspaceActionClientAllowExpired
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .action(
    async ({
      bindArgsParsedInputs: [workspaceId, integrationId],
    }: {
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

      await metaConversionsService.disconnectCapi({
        channel: "whatsapp",
        integration,
      })

      return { success: true }
    },
  )
