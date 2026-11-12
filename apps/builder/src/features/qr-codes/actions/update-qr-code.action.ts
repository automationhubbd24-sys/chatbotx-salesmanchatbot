"use server"

import { qrCodeService } from "@salesmanchatbot.io/business"
import { salesmanChatbotException } from "@salesmanchatbot.io/business/errors"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { getTranslations } from "next-intl/server"
import { returnValidationErrors } from "next-safe-action"
import { workspaceActionClient } from "@/lib/safe-action"
import { updateQrCodeRequest } from "../schema/action"

export const updateQrCodeAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .inputSchema(updateQrCodeRequest)
  .action(async ({ bindArgsParsedInputs: [workspaceId, id], parsedInput }) => {
    const t = await getTranslations()
    try {
      await qrCodeService.update({
        workspaceId,
        id,
        data: parsedInput,
        duplicateNameMessage: t("messages.nameAlreadyExists", {
          feature: t("fields.qrCode.label"),
        }),
      })
    } catch (error) {
      if (error instanceof salesmanChatbotException && error.code === "validation") {
        // The service tags each failure with the form field it belongs to
        // (`name` or `flowId`); fall back to `name` only when it left the
        // field unset.
        return returnValidationErrors(updateQrCodeRequest, {
          [error.field ?? "name"]: {
            _errors: [error.message],
          },
        })
      }

      throw error
    }
  })
