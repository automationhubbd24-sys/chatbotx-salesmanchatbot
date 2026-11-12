import {
  commentIncludeKeywordsSchema,
  commentReplySchema,
  igStoryTargetSchema,
} from "@salesmanchatbot.io/database/partials"
import {
  createSelectSchema,
  igStoryAutomationModel,
} from "@salesmanchatbot.io/database/schema"
import z from "zod"

export const igStoryResource = createSelectSchema(igStoryAutomationModel, {
  id: z.string(),
  workspaceId: z.string(),
  folderId: z.string().nullish(),
  story: igStoryTargetSchema,
  reply: commentReplySchema,
  includeKeywords: commentIncludeKeywordsSchema,
})
export type IgStoryResource = z.infer<typeof igStoryResource>
