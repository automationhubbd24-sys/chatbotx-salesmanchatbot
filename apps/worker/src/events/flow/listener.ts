import {
  broadcastAnalyticsService,
  commentAutomationAnalyticsService,
  flowAnalyticsService,
  magicLinkAnalyticsService,
  refLinkAnalyticsService,
  sequenceAnalyticsService,
} from "@salesmanchatbot.io/analytics"
import type { FlowEvenTypeMap } from "@salesmanchatbot.io/event-bus"
import { flowEventTypeSchema } from "@salesmanchatbot.io/flow-config"

export const flowListeners: Partial<FlowEvenTypeMap> = {
  [flowEventTypeSchema.enum["flow:clicked"]]: [
    {
      name: "broadcast-ops",
      handler: broadcastAnalyticsService.onClicked.bind(
        broadcastAnalyticsService,
      ),
    },
    {
      name: "sequence-ops",
      handler: sequenceAnalyticsService.onClicked.bind(
        sequenceAnalyticsService,
      ),
    },
    {
      name: "flow-ops",
      handler: flowAnalyticsService.onClicked.bind(flowAnalyticsService),
    },
    {
      name: "magic-link-stats",
      handler: magicLinkAnalyticsService.onClicked.bind(
        magicLinkAnalyticsService,
      ),
    },
    {
      name: "comment-automation-ops",
      handler: commentAutomationAnalyticsService.onClicked.bind(
        commentAutomationAnalyticsService,
      ),
    },
  ],
  [flowEventTypeSchema.enum["flow:ref"]]: [
    {
      name: "ref-link-stats",
      handler: refLinkAnalyticsService.handler.bind(refLinkAnalyticsService),
    },
  ],
}
