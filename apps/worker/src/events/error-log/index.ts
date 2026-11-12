import { errorLogEventBus } from "@salesmanchatbot.io/event-bus"
import { errorLogListeners } from "./listener"

export default {
  bus: errorLogEventBus,
  listeners: errorLogListeners,
}
