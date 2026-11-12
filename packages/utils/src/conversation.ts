import { z } from "zod"

/**
 * Lives here (not `@salesmanchatbot.io/database`) so a "use client" component (e.g.
 * the broadcast inbox picker) can read the enum without pulling in the
 * database package. `@salesmanchatbot.io/database/partials` re-exports this for
 * existing backend importers. Mirrors the `channelTypes` precedent in
 * `./channel.ts`.
 */
export const inboxStatuses = z.enum(["connected", "disconnected"])
export type InboxStatus = z.infer<typeof inboxStatuses>
