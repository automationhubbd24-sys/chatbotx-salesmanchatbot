import {
  createSelectSchema,
  inboxTeamMemberModel,
} from "@salesmanchatbot.io/database/schema"
import { z } from "zod"

export const inboxTeamMemberResource = createSelectSchema(
  inboxTeamMemberModel,
  {
    id: z.string(),
    inboxTeamId: z.string(),
  },
)
export type InboxTeamMemberResource = z.infer<typeof inboxTeamMemberResource>
