import type { MinigameType } from "@salesmanchatbot.io/database/partials"
import type {
  MinigameContactModel,
  MinigameModel,
} from "@salesmanchatbot.io/database/types"
import type { ComponentType } from "react"
import { DrawLotsPlayScreen } from "./draw-lots-play-screen"
import { GashaponPlayScreen } from "./gashapon-play-screen"
import { JackpotPlayScreen } from "./jackpot-play-screen"
import { LuckyWheelPlayScreen } from "./lucky-wheel-play-screen"
import { ScratchOffPlayScreen } from "./scratch-off-play-screen"

export type MinigamePlayScreenProps = {
  minigame: MinigameModel
  contactState: MinigameContactModel
  token: string
  /** `null` when no Sharing Node is configured, or the player's channel cannot carry a ref. */
  shareUrl: string | null
}

export const MINIGAME_PLAY_SCREENS: Partial<
  Record<MinigameType, ComponentType<MinigamePlayScreenProps>>
> = {
  jackpot: JackpotPlayScreen,
  luckyWheel: LuckyWheelPlayScreen,
  gashapon: GashaponPlayScreen,
  drawLots: DrawLotsPlayScreen,
  scratchOff: ScratchOffPlayScreen,
}
