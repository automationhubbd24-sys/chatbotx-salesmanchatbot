"use server"

import { aiMcpServerService } from "@salesmanchatbot.io/business"
import { notFoundException } from "@salesmanchatbot.io/business/errors"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { resolveBotFieldVariableText } from "@salesmanchatbot.io/variables"
import { getTranslations } from "next-intl/server"
import { returnValidationErrors } from "next-safe-action"
import { isValidationException } from "@/lib/errors/validation-exception"
import { workspaceActionClient } from "@/lib/safe-action"
import { updatePrivateAIMcpServerRequest } from "../schema/action"

export const updateAIMcpServerAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .inputSchema(updatePrivateAIMcpServerRequest)
  .action(async (props) => {
    const {
      bindArgsParsedInputs: [workspaceId, id],
      parsedInput,
    } = props
    const t = await getTranslations()

    if (parsedInput.auth.type === "token") {
      const resolution = await resolveBotFieldVariableText({
        text: parsedInput.auth.token,
        workspaceId,
      })
      if (resolution.status !== "resolved") {
        return returnValidationErrors(updatePrivateAIMcpServerRequest, {
          auth: { token: { _errors: [t("validation.invalidApiKey")] } },
        })
      }
    }

    const mcpServer = await aiMcpServerService.findBy({
      where: {
        id,
        workspaceId,
      },
    })
    if (!mcpServer) {
      throw notFoundException(
        t("messages.featureNotFound", { feature: t("fields.mcpServer.label") }),
      )
    }

    try {
      await aiMcpServerService.update({ workspaceId, id }, parsedInput)
    } catch (error) {
      if (isValidationException(error)) {
        return returnValidationErrors(updatePrivateAIMcpServerRequest, {
          name: {
            _errors: [
              t("messages.nameAlreadyExists", {
                feature: t("fields.mcpServer.label"),
              }),
            ],
          },
        })
      }

      throw error
    }
  })
