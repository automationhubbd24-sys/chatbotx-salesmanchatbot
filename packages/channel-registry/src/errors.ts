import type { IntegrationType } from "@salesmanchatbot.io/database/partials"

export class IntegrationNotFoundError extends Error {
  readonly channel: IntegrationType
  readonly identifier: string

  constructor(channel: IntegrationType, identifier: string) {
    super(`Integration not found: ${channel} ${identifier}`)
    this.name = "IntegrationNotFoundError"
    this.channel = channel
    this.identifier = identifier
  }
}
