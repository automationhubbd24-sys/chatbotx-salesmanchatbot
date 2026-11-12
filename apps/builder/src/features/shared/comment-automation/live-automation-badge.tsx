"use client"

import type { CommentPost } from "@salesmanchatbot.io/database/partials"
import { isLiveCommentAutomation } from "@salesmanchatbot.io/database/partials"
import { Badge } from "@salesmanchatbot.io/ui/components/ui/badge"
import { useTranslations } from "next-intl"

/** Marks a Live automation in a list that mixes Live and post automations. */
export function LiveAutomationBadge({ post }: { post: CommentPost }) {
  const t = useTranslations("commentAutomation")
  if (!isLiveCommentAutomation(post)) {
    return null
  }
  return (
    <Badge className="ml-2 align-middle" variant="destructive">
      {t("liveBadge")}
    </Badge>
  )
}
