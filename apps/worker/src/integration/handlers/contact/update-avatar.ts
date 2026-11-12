import { ensureContactAvatarMirrored } from "@salesmanchatbot.io/channel-registry/media-hydration"
import type { LowJobUpdateContactAvatar } from "@salesmanchatbot.io/worker-config"
export const updateContactAvatar = async (
  data: LowJobUpdateContactAvatar["data"],
): Promise<void> => {
  await ensureContactAvatarMirrored({
    contactInboxId: data.contactInboxId,
    workspaceId: data.workspaceId,
  })
}
