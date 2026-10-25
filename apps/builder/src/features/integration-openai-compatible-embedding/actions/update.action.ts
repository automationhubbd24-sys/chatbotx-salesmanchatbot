"use server"

import {
  integrationOpenaiCompatibleEmbeddingService,
  validateOpenaiCompatibleBaseUrlForEnvironment,
} from "@chatbotx.io/business"
import { ChatbotXException } from "@chatbotx.io/business/errors"
import { secretTextAuthSchema } from "@chatbotx.io/sdk"
import { getTranslations } from "next-intl/server"
import { returnValidationErrors } from "next-safe-action"
import {
  type WorkspaceIdRequestParams,
  workspaceIdrequestParams,
} from "@/features/common/schema"
import { verifyOpenaiCompatibleProvider } from "@/features/integration-openai-compatible/lib"
import { hasWorkspacePermission } from "@/lib/auth/permission-routes"
import { workspaceActionClient } from "@/lib/safe-action"
import {
  type UpdateOpenaiCompatibleEmbeddingRequest,
  updateOpenaiCompatibleEmbeddingRequest,
} from "../schema/request"

export const updateOpenaiCompatibleEmbeddingAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(updateOpenaiCompatibleEmbeddingRequest)
  .action(
    async ({
      parsedInput,
      bindArgsParsedInputs: [workspaceId],
      ctx,
    }: {
      parsedInput: UpdateOpenaiCompatibleEmbeddingRequest
      bindArgsParsedInputs: WorkspaceIdRequestParams
      ctx: { workspaceMemberPermissions: Parameters<typeof hasWorkspacePermission>[0] }
    }) => {
      if (!hasWorkspacePermission(ctx.workspaceMemberPermissions, "superAdmin")) {
        throw new Error(
          "You need to be a super admin to manage text embedding integrations",
        )
      }

      const t = await getTranslations()
      const apiKey = parsedInput.apiKey?.trim()
      let baseURL = parsedInput.baseURL

      if (apiKey || parsedInput.baseURL) {
        const existing =
          await integrationOpenaiCompatibleEmbeddingService.findByWorkspaceId(
            workspaceId,
          )
        if (!existing) {
          throw new Error("OpenAI-compatible text embedding integration not found")
        }

        try {
          baseURL = await validateOpenaiCompatibleBaseUrlForEnvironment(
            baseURL ?? existing.baseURL,
          )
        } catch (error) {
          if (isBaseUrlValidationError(error)) {
            return returnValidationErrors(updateOpenaiCompatibleEmbeddingRequest, {
              baseURL: {
                _errors: [
                  t("openaiCompatibleTextEmbedding.validation.invalidBaseURL"),
                ],
              },
            })
          }
          throw error
        }

        const existingAuth = secretTextAuthSchema.safeParse(existing.auth)
        const verifyResult = await verifyOpenaiCompatibleProvider({
          apiKey: apiKey || (existingAuth.success ? existingAuth.data.secretText : undefined),
          baseURL,
        })
        if (!verifyResult.ok) {
          return returnValidationErrors(updateOpenaiCompatibleEmbeddingRequest, {
            [verifyResult.reason === "unsafe_base_url" ? "baseURL" : "apiKey"]: {
              _errors: [
                verifyResult.reason === "unsafe_base_url"
                  ? t("openaiCompatibleTextEmbedding.validation.invalidBaseURL")
                  : t("validation.invalidApiKey"),
              ],
            },
          })
        }
      }

      await integrationOpenaiCompatibleEmbeddingService.update(workspaceId, {
        ...parsedInput,
        ...(baseURL === undefined ? {} : { baseURL }),
        ...(apiKey ? { apiKey } : { apiKey: undefined }),
      })
    },
  )

const isBaseUrlValidationError = (error: unknown): error is ChatbotXException =>
  error instanceof ChatbotXException &&
  (error.code === "invalidBaseUrl" || error.code === "ssrfBlocked")
