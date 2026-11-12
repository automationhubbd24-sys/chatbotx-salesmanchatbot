import { dashboardEventBus } from "@salesmanchatbot.io/event-bus"
import { analyticsDashboardListeners } from "./listener"

export const analyticsDashboardEvents = {
  bus: dashboardEventBus.cloneForGroup("analytics-dashboard-events-group"),
  listeners: analyticsDashboardListeners,
}
