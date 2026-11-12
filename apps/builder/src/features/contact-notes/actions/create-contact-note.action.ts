"use server"
import { contactNoteService } from "@salesmanchatbot.io/business"
import type { UserModel } from "@salesmanchatbot.io/database/types"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { requireContactPermissionScope } from "@/features/contacts/permissions"
import { workspaceActionClient } from "@/lib/safe-action"
import { addContactNoteRequest } from "../schema/action"
export const createContactNoteAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .inputSchema(addContactNoteRequest)
  .action(
    async ({
      bindArgsParsedInputs: [workspaceId, contactId],
      parsedInput,
      ctx,
    }) => {
      const accessScope = await requireContactPermissionScope(workspaceId)
      return await contactNoteService.create({
        workspaceId,
        contactId,
        accessScope,
        createdById: (ctx.user as UserModel).id,
        text: parsedInput.text,
      })
    },
  )
