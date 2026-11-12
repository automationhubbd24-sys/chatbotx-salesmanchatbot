import {
  contactNoteModel,
  createSelectSchema,
} from "@salesmanchatbot.io/database/schema"
import { zodBigintAsString } from "@salesmanchatbot.io/utils"

export const contactNoteResource = createSelectSchema(contactNoteModel, {
  id: zodBigintAsString(),
  contactId: zodBigintAsString(),
  createdById: zodBigintAsString().nullable(),
})
