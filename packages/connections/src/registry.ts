import {
  CONNECTION_STORE_BINDINGS,
  type ConnectionAdapter,
  type ConnectionRegistry,
  claudeConnectionProvider,
  deepseekConnectionProvider,
  geminiConnectionProvider,
  openaiCompatibleConnectionProvider,
  openaiConnectionProvider,
  openrouterConnectionProvider,
} from "@salesmanchatbot.io/business/connection"
import { integration as integrationActiveCampaign } from "@salesmanchatbot.io/integration-active-campaign"
import { integration as integrationApi } from "@salesmanchatbot.io/integration-api"
import { integration as integrationChatbotx } from "@salesmanchatbot.io/integration-salesmanchatbot"
import { integration as integrationDrip } from "@salesmanchatbot.io/integration-drip"
import { integration as integrationFacebookAds } from "@salesmanchatbot.io/integration-facebook-ads"
import { integration as integrationGetResponse } from "@salesmanchatbot.io/integration-get-response"
import { integration as integrationGoogleCalendar } from "@salesmanchatbot.io/integration-google-calendar"
import { integration as integrationGoogleSheets } from "@salesmanchatbot.io/integration-google-sheets"
import { integration as integrationInstagram } from "@salesmanchatbot.io/integration-instagram"
import { integration as integrationInstagramFacebook } from "@salesmanchatbot.io/integration-instagram-facebook"
import { integration as integrationKlaviyo } from "@salesmanchatbot.io/integration-klaviyo"
import { integration as integrationMailchimp } from "@salesmanchatbot.io/integration-mailchimp"
import { integration as integrationMailerLite } from "@salesmanchatbot.io/integration-mailer-lite"
import { integration as integrationMessenger } from "@salesmanchatbot.io/integration-messenger"
import { integration as integrationMoosend } from "@salesmanchatbot.io/integration-moosend"
import { integration as integrationSendGrid } from "@salesmanchatbot.io/integration-sendgrid"
import { integration as integrationSmtp } from "@salesmanchatbot.io/integration-smtp"
import { integration as integrationTelegram } from "@salesmanchatbot.io/integration-telegram"
import { integration as integrationTiktok } from "@salesmanchatbot.io/integration-tiktok"
import { integration as integrationWebchat } from "@salesmanchatbot.io/integration-webchat"
import { integration as integrationWhatsapp } from "@salesmanchatbot.io/integration-whatsapp"
import { integration as integrationZalo } from "@salesmanchatbot.io/integration-zalo"
import type { Integration, IntegrationDefinition } from "@salesmanchatbot.io/sdk"

type StoreBindingKey = keyof typeof CONNECTION_STORE_BINDINGS

type StoreBoundAdapter<Key extends StoreBindingKey> = ConnectionAdapter & {
  readonly storeKey: Key
}

type StoreBoundConnectionRegistry = {
  [Key in keyof ConnectionRegistry]: Key extends StoreBindingKey
    ? StoreBoundAdapter<Key> | null
    : ConnectionAdapter | null
}

/**
 * Builds a `ConnectionAdapter` from an `integrations/<name>` SDK package's
 * `Integration` instance. Throws at module-load time (not per-request) if
 * the provider's `connection` block is missing — every `IntegrationType`
 * wired into this registry is asserted, at registration time, to have one;
 * a provider that regresses to having none fails the build immediately
 * instead of silently returning `undefined` behind an optional chain.
 */
const fromIntegration = <Key extends StoreBindingKey>(
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous registry
  integration: Integration<IntegrationDefinition<any, any, any>>,
  storeKey: Key,
  credentialType?: ConnectionAdapter["credentialType"],
): StoreBoundAdapter<Key> => {
  if (integration.name !== storeKey) {
    throw new Error(
      `@salesmanchatbot.io/connections: integration "${integration.name}" cannot use store binding "${storeKey}"`,
    )
  }
  const provider = integration.connection
  if (!provider) {
    throw new Error(
      `@salesmanchatbot.io/connections: "${integration.name}" has no connection block registered under CONNECTION_REGISTRY.${storeKey}`,
    )
  }
  const store = CONNECTION_STORE_BINDINGS[storeKey] ?? undefined
  return { integration, provider, store, credentialType, storeKey }
}

/**
 * A credential-only provider (no `integrations/` package) paired with its
 * store binding — the same shape `fromIntegration` produces, minus the SDK
 * `Integration` wrapper these providers never had.
 */
const fromCredentialProvider = <Key extends StoreBindingKey>(
  provider: ConnectionAdapter["provider"],
  storeKey: Key,
): StoreBoundAdapter<Key> => {
  const store = CONNECTION_STORE_BINDINGS[storeKey]
  if (!store) {
    throw new Error(
      `@salesmanchatbot.io/connections: no store binding for "${storeKey}"`,
    )
  }
  return { provider, store, storeKey }
}

/**
 * Compile-time exhaustive `Record<IntegrationType, ConnectionAdapter | null>`.
 * `null` marks a type with no generic connection-engine lifecycle:
 * `metaCatalog`, `openaiCompatibleEmbedding`, `outlookCalendar`, and `threads`.
 * `salesmanchatbot` DOES have a real adapter (its `store` is
 * `undefined` — it has no satellite table; the `Inbox` row is the whole
 * connection).
 */
export const CONNECTION_REGISTRY: StoreBoundConnectionRegistry = {
  activeCampaign: fromIntegration(integrationActiveCampaign, "activeCampaign"),
  api: fromIntegration(integrationApi, "api"),
  salesmanchatbot: fromIntegration(integrationChatbotx, "salesmanchatbot"),
  claude: fromCredentialProvider(claudeConnectionProvider, "claude"),
  deepseek: fromCredentialProvider(deepseekConnectionProvider, "deepseek"),
  drip: fromIntegration(integrationDrip, "drip"),
  facebookAds: fromIntegration(
    integrationFacebookAds,
    "facebookAds",
    "messenger",
  ),
  gemini: fromCredentialProvider(geminiConnectionProvider, "gemini"),
  getResponse: fromIntegration(integrationGetResponse, "getResponse"),
  googleCalendar: fromIntegration(
    integrationGoogleCalendar,
    "googleCalendar",
    "google",
  ),
  googleSheets: fromIntegration(
    integrationGoogleSheets,
    "googleSheets",
    "google",
  ),
  instagram: fromIntegration(integrationInstagram, "instagram", "instagram"),
  instagramFacebook: fromIntegration(
    integrationInstagramFacebook,
    "instagramFacebook",
    "instagramFacebook",
  ),
  klaviyo: fromIntegration(integrationKlaviyo, "klaviyo"),
  mailchimp: fromIntegration(integrationMailchimp, "mailchimp"),
  mailerLite: fromIntegration(integrationMailerLite, "mailerLite"),
  messenger: fromIntegration(integrationMessenger, "messenger", "messenger"),
  metaCatalog: null,
  moosend: fromIntegration(integrationMoosend, "moosend"),
  openai: fromCredentialProvider(openaiConnectionProvider, "openai"),
  openaiCompatible: fromCredentialProvider(
    openaiCompatibleConnectionProvider,
    "openaiCompatible",
  ),
  openaiCompatibleEmbedding: null,
  openrouter: fromCredentialProvider(
    openrouterConnectionProvider,
    "openrouter",
  ),
  outlookCalendar: null,
  sendGrid: fromIntegration(integrationSendGrid, "sendGrid"),
  smtp: fromIntegration(integrationSmtp, "smtp"),
  telegram: fromIntegration(integrationTelegram, "telegram"),
  threads: null,
  tiktok: fromIntegration(integrationTiktok, "tiktok", "tiktok"),
  webchat: fromIntegration(integrationWebchat, "webchat"),
  whatsapp: fromIntegration(integrationWhatsapp, "whatsapp", "whatsapp"),
  zalo: fromIntegration(integrationZalo, "zalo", "zalo"),
}
