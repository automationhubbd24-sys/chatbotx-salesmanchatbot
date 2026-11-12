import { getChildLogger } from "@salesmanchatbot.io/logger"

export const logger = getChildLogger("EventBus")
export const deadLetterLogger = getChildLogger("EventBus:DeadLetter")
