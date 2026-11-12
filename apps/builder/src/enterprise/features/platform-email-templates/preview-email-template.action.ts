"use server"

import {
  assertEnterpriseFeatures,
  isPlatformAdmin,
  isSuperAdmin,
} from "@salesmanchatbot.io/business"
import type { UserModel } from "@salesmanchatbot.io/database/types"
import { compileEmailPreview } from "@salesmanchatbot.io/mail/preview"
import { z } from "zod"
import { authActionClient } from "@/lib/safe-action"

export const previewEmailTemplateAction = authActionClient
  .inputSchema(z.object({ body: z.string().max(100_000) }))
  .action(
    async ({
      ctx,
      parsedInput,
    }: {
      ctx: { user: UserModel }
      parsedInput: { body: string }
    }) => {
      await assertEnterpriseFeatures()
      if (!(isSuperAdmin(ctx.user) || (await isPlatformAdmin(ctx.user)))) {
        throw new Error("Unauthorized")
      }
      return compileEmailPreview(parsedInput.body)
    },
  )
