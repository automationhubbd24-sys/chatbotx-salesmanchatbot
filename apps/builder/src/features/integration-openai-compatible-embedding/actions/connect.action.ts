"use server"

import {
  integrationOpenaiCompatibleEmbeddingService,
  validateOpenaiCompatibleBaseUrlForEnvironment,
} from "@chatbotx.io/business"
import { ChatbotXException } from "@chatbotx.io/business/errors"
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
  type ConnectOpenaiCompatibleEmbeddingRequest,
  connectOpenaiCompatibleEmbeddingRequest,
} from "../schema/request"

export const connectOpenaiCompatibleEmbeddingAction = workspaceActionClient
  .bindArgsSchemas(workspaceIdrequestParams)
  .inputSchema(connectOpenaiCompatibleEmbeddingRequest)
  .action(
    async ({
      parsedInput,
      bindArgsParsedInputs: [workspaceId],
      ctx,
    }: {
      parsedInput: ConnectOpenaiCompatibleEmbeddingRequest
      bindArgsParsedInputs: WorkspaceIdRequestParams
      ctx: { workspaceMemberPermissions: Parameters<typeof hasWorkspacePermission>[0] }
    }) => {
      if (!hasWorkspacePermission(ctx.workspaceMemberPermissions, "superAdmin")) {
        throw new Error(
          "You need to be a super admin to manage text embedding integrations",
        )
      }

      const t = await getTranslations()
      let baseURL: string

      try {
        baseURL = await validateOpenaiCompatibleBaseUrlForEnvironment(
          parsedInput.baseURL,
        )
      } catch (error) {
        if (isBaseUrlValidationError(error)) {
          return returnValidationErrors(connectOpenaiCompatibleEmbeddingRequest, {
            baseURL: {
              _errors: [
                t("openaiCompatibleTextEmbedding.validation.invalidBaseURL"),
              ],
            },
          })
        }
        throw error
      }

      const verifyResult = await verifyOpenaiCompatibleProvider({
        apiKey: parsedInput.apiKey,
        baseURL,
      })
      if (!verifyResult.ok) {
        return returnValidationErrors(connectOpenaiCompatibleEmbeddingRequest, {
          [verifyResult.reason === "unsafe_base_url" ? "baseURL" : "apiKey"]: {
            _errors: [
              verifyResult.reason === "unsafe_base_url"
                ? t("openaiCompatibleTextEmbedding.validation.invalidBaseURL")
                : t("validation.invalidApiKey"),
            ],
          },
        })
      }

      await integrationOpenaiCompatibleEmbeddingService.connect({
        workspaceId,
        ...parsedInput,
        baseURL,
      })
    },
  )

const isBaseUrlValidationError = (error: unknown): error is ChatbotXException =>
  error instanceof ChatbotXException &&
  (error.code === "invalidBaseUrl" || error.code === "ssrfBlocked")
