import { salesmanChatbotException } from "../errors"

/** The contact's channel cannot take/release/pass a thread (no handler registered). */
export class ThreadControlUnsupportedError extends salesmanChatbotException {
  constructor(channel: string) {
    super(
      `Conversation routing is not supported on the ${channel} channel`,
      "threadControlUnsupported",
      400,
    )
  }
}
