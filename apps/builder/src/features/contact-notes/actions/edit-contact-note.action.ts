"use server"
import { contactNoteService } from "@salesmanchatbot.io/business"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"
import { requireContactPermissionScope } from "@/features/contacts/permissions"
import { workspaceActionClient } from "@/lib/safe-action"
import { updateContactNoteRequest } from "../schema/action"
export const editContactNoteAction = workspaceActionClient
  .bindArgsSchemas([zodBigintAsString(), zodBigintAsString()])
  .inputSchema(updateContactNoteRequest)
  .action(
    async ({ bindArgsParsedInputs: [workspaceId, contactId], parsedInput }) => {
      const accessScope = await requireContactPermissionScope(workspaceId)
      return await contactNoteService.update({
        workspaceId,
        contactId,
        accessScope,
        noteId: parsedInput.contactNoteId,
        text: parsedInput.text,
      })
    },
  )
