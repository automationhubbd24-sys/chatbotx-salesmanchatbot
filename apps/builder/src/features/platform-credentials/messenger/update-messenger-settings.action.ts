"use server"

import { platformCredentialService } from "@salesmanchatbot.io/business"
import {
  type MessengerCredential,
  messengerCredentialUpdateSchema,
} from "@salesmanchatbot.io/database/partials"
import { authActionClient } from "@/lib/safe-action"
import { credentialScopeSchema, resolveCredentialScopedUserId } from "../scope"

export const updateMessengerSettingAction = authActionClient
  .bindArgsSchemas([credentialScopeSchema])
  .inputSchema(messengerCredentialUpdateSchema)
  .action(async ({ ctx, bindArgsParsedInputs: [scope], parsedInput }) => {
    const scopedUserId = resolveCredentialScopedUserId(ctx.user, scope)
    const config: MessengerCredential = {
      clientId: parsedInput.clientId,
      version: parsedInput.version,
      verifyToken: parsedInput.verifyToken,
      clientSecret: parsedInput.clientSecret,
      marketingMessagesConfigId: parsedInput.marketingMessagesConfigId,
    }

    await platformCredentialService.upsert({
      userId: scopedUserId,
      type: "messenger",
      config,
    })
  })
