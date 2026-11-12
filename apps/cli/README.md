# salesmanChatbot CLI

CLI for interacting with the salesmanChatbot API.

Commands are automatically generated from the salesmanChatbot public API spec — no manual update needed when new APIs are added.

---

## Installation

```bash
npm install -g salesmanchatbot
# or
pnpm install -g salesmanchatbot
```

---

## Setup

### 1. Set API Configuration

Before running any command, save your API key and URL:

```bash
salesmanchatbot config set --apiKey <yourApiKey> --apiUrl <yourApiUrl>
```

- `--apiKey` — Workspace API key (found in salesmanChatbot Settings → Developer → API Keys)
- `--apiUrl` — Base API URL of your instance, e.g. `https://app.salesmanchatbot.io/api`

You can also set them individually:

```bash
salesmanchatbot config set --apiKey <yourApiKey>
salesmanchatbot config set --apiUrl https://app.salesmanchatbot.io/api
```

Or via environment variables:

```bash
export SALESMANCHATBOT_API_KEY=your_api_key
export SALESMANCHATBOT_API_URL=https://app.salesmanchatbot.io/api
```

For local dev with a self-signed certificate:

```bash
salesmanchatbot config set --allowSelfSignedCert true
# or
export SALESMANCHATBOT_ALLOW_SELF_SIGNED_CERT=true
```

### 2. Global Options

Available on every command:

| Option | Description |
|---|---|
| `--apiKey` | Override API key for this run |
| `--apiUrl` | Override API URL for this run |
| `--allowSelfSignedCert` | Disable TLS cert validation |
| `--refresh-spec` | Force re-fetch the OpenAPI spec (clears cache) |

---

## Commands

### `config`

```bash
salesmanchatbot config set --apiKey <key> --apiUrl <url>
```

---

### `members`

```bash
salesmanchatbot members list                                # List workspace members
                                                     # [--page --perPage --sort --keyword]
salesmanchatbot members get <memberId>                      # Get workspace member
```

---

### `channels` (dead — do not use)

`channelsPublicRouter` (`/v1/channels/api/*`) is gated by a channel token, not a workspace token, so `isWorkspaceTokenOperation` filters every one of its operations out of the CLI. There is no `salesmanchatbot channels` command; running one silently no-ops (exit 0, no error). Use `salesmanchatbot inboxes list` instead — verified live against a running instance (`salesmanchatbot channels --help` shows no `channels` group at all; `salesmanchatbot inboxes --help` shows `list`).

```bash
salesmanchatbot inboxes list                                # List connected inboxes
```

---

### `teams`

```bash
salesmanchatbot teams list                                  # List teams
salesmanchatbot teams get <id>                              # Get team
salesmanchatbot teams create --name <name>                  # Create team
salesmanchatbot teams update <id> --name <name>              # Update team
salesmanchatbot teams delete <id>                            # Delete team
salesmanchatbot teams member add <id> --userIds <userIds>    # Add members to team
salesmanchatbot teams member delete <id> --userIds <userIds> # Remove members from team
```

---

### `tags`

```bash
salesmanchatbot tags list                                   # Get all tags
salesmanchatbot tags create --name <name>                   # Create tag
salesmanchatbot tags get <idOrName>                         # Get tag
salesmanchatbot tags update <id> --name <name>              # Update tag
salesmanchatbot tags delete <id>                            # Delete tag
```

---

### `custom-fields`

```bash
salesmanchatbot custom-fields list                          # Get all custom fields
salesmanchatbot custom-fields create --name <name> --type <type>
salesmanchatbot custom-fields get <idOrName>                # Get custom field
salesmanchatbot custom-fields update <id> --name <name>     # [--description --folderId]
salesmanchatbot custom-fields delete <id>
```

---

### `bot-fields`

```bash
salesmanchatbot bot-fields list                             # Get all bot fields
salesmanchatbot bot-fields create --name <name> --type <type> --value <value> --description <description>
                                                     # [--folderId]
salesmanchatbot bot-fields update --fields <fields>         # Set multiple bot field values, by id or name
                                                     # fields: JSON array of {id,value} or {name,value}
salesmanchatbot bot-fields get <idOrName>                   # Get bot field
# `bot-fields update <idOrName> --value <value>` (single field, PUT /v1/bot-fields/{idOrName}) is NOT
# reachable — collides with `update` above under the same commandName; see Known command-name collisions.
salesmanchatbot bot-fields delete <idOrName>                # Unset bot field value
salesmanchatbot bot-fields reset <idOrName>                 # Clear one bot field value, keep the field
salesmanchatbot bot-fields bulk-reset --ids <ids>           # Clear up to 100 bot field values by id
```

---

### `contacts`

The `<identifier>` parameter (`packages/business/src/contact/utils.ts` `parseContactIdentifier`, called via `contactService.resolveIdByIdentifier`) requires one of these prefixes — a bare value or unrecognized prefix throws `404 Invalid identifier format`:

| Format | Example | Lookup by |
|--------|---------|-----------|
| `id:<value>` | `id:123456789` | Contact ID |
| `email:<value>` | `email:user@example.com` | Email address |
| `phone:<value>` | `phone:+84708123123` | Phone number |

```bash
# Basic CRUD
salesmanchatbot contacts list                               # [--page --perPage --sort --keyword --contactFilter]
salesmanchatbot contacts create --email <email>             # [--phoneNumber --contactId --firstName --lastName]
salesmanchatbot contacts count                              # Count matching filter [--page --perPage --sort --keyword --contactFilter]
salesmanchatbot contacts get <identifier>
salesmanchatbot contacts update <identifier>
salesmanchatbot contacts delete <identifier>
salesmanchatbot contacts upsert add <identifier>            # Insert or update by identifier
salesmanchatbot contacts import --fileId <fileId> --channel <channel> --inboxId <inboxId>
                                                     # [--timezone --countryCode]
salesmanchatbot contacts block <identifier>
salesmanchatbot contacts unblock <identifier>
salesmanchatbot contacts filter-fields                      # Field/operator reference for --contactFilter

# Discover IDs accepted by contactFilter.commentedOnPost
salesmanchatbot channel-posts list                           # [--limit --search --cursor]
salesmanchatbot channel-posts options-by-ids --ids <ids>     # Resolve saved-filter post labels

# Imports & exports
salesmanchatbot contacts import-template                    # CSV template as text [--language]
salesmanchatbot contacts imports-upload-url --fileName <name> --mimeType <mime> --fileSize <bytes>
                                                     # Returns fileId + presigned PUT URL
salesmanchatbot contacts imports-files-headers <fileId>      # Column headers of the uploaded file
salesmanchatbot contacts imports                            # [--page --perPage --status --keyword --sort]
salesmanchatbot contacts find-by-imports <id>                # Get one import job
salesmanchatbot contacts export --fields <fields>            # [--contactIds --exportAll --filter]
salesmanchatbot contacts find-by-export-files <fileId>       # Poll export status/download URL

# Bulk
salesmanchatbot contacts bulk-tags --contactIds <contactIds> --tags <tags>
salesmanchatbot contacts bulk-delete --contactIds <contactIds>
salesmanchatbot contacts bulk-sequences --contactIds <contactIds> --sequenceIds <sequenceIds>

# Tags
salesmanchatbot contacts tags list <identifier>             # Get all tags on a contact
salesmanchatbot contacts tags update <identifier> --tags <tags>  # Replace all tags on contact
salesmanchatbot contacts tag add <identifier> --tagIds <tagIds>
salesmanchatbot contacts tag delete <identifier> --tagIds <tagIds>
salesmanchatbot contacts by-name add <identifier> --tags <tags>  # Add tags by name (creates missing ones)

# Custom fields
salesmanchatbot contacts custom-fields list <identifier>    # Get all custom fields from contact
salesmanchatbot contacts custom-fields update <identifier> --operations <operations>
                                                     # Batch set/append/prepend/increase/decrease
                                                     # (applyCustomFieldOperations; wins a naming collision
                                                     # with the single-field PUT below — see note)
salesmanchatbot contacts custom-field get <identifier> <idOrName>
# `contacts custom-field update <identifier> <idOrName> --value <value>` (single field, PUT
# .../custom-fields/{idOrName}) is NOT reachable — collides with `custom-fields update` above
# under the same commandName; see Known command-name collisions.
salesmanchatbot contacts custom-field delete <identifier>   # Clear ALL custom fields (see collision note — the
                                                     # per-field-id delete variant is unreachable)

# Notes
salesmanchatbot contacts notes list <identifier>
salesmanchatbot contacts notes update <identifier> <noteId> --text <text>
salesmanchatbot contacts note add <identifier> --text <text>
salesmanchatbot contacts note delete <identifier> <noteId>

# Sequences
salesmanchatbot contacts sequences list <identifier>
salesmanchatbot contacts sequences update <identifier> --sequenceIds <sequenceIds>  # Replace subscriptions
salesmanchatbot contacts sequence add <identifier> --sequenceIds <sequenceIds>
salesmanchatbot contacts sequence delete <identifier> --sequenceIds <sequenceIds>

# Channel identities
salesmanchatbot contacts inboxes list <identifier>          # List per-channel contact-inbox connections
salesmanchatbot contacts refresh-profile add <identifier> --contactInboxId <contactInboxId>

# Messaging & Automation
salesmanchatbot contacts messages list <identifier>         # [--perPage --cursor]
salesmanchatbot contacts message get <identifier> <messageId>
salesmanchatbot contacts message send <identifier>          # [--text --files --mediaFile --mediaFileId --mediaFileIds
                                                     #  --flowId --nodeId --inboxId --clientId
                                                     #  --replyToMessageId --replyToMessageCreatedAt --isPrivateReply]
salesmanchatbot contacts flow add <identifier> --flowId <flowId>  # [--inboxId]
salesmanchatbot contacts auto-replie add <identifier> --keyword <keyword>  # [--inboxId] (group name is singular — CLI-generated, not a typo)

# Coupons
salesmanchatbot contacts coupons list <identifier>          # List coupons issued to contact
```

---

### `conversations`

```bash
salesmanchatbot conversations list                          # [--botCategory --assignedId --channel --status --keyword
                                                     #  --botEnabled --tags --contactFilter --cursor --perPage --sort]
salesmanchatbot conversations get <id>
salesmanchatbot conversations assign add <id> --assignedId <assignedId>  # null clears the assignee
salesmanchatbot conversations archive add <id>
salesmanchatbot conversations unarchive add <id>
salesmanchatbot conversations read add <id>
salesmanchatbot conversations unread add <id>
salesmanchatbot conversations follow add <id>
salesmanchatbot conversations unfollow add <id>
salesmanchatbot conversations enable-bot add <id>
salesmanchatbot conversations disable-bot add <id>

# Messages
salesmanchatbot conversations messages list <conversationId>  # [--perPage --cursor]
salesmanchatbot conversations message get <conversationId> <messageId> --createdAt <createdAt>
salesmanchatbot conversations message send <conversationId>   # [--text --files --mediaFile --mediaFileId --mediaFileIds
                                                     #  --flowId --nodeId --inboxId --clientId
                                                     #  --replyToMessageId --replyToMessageCreatedAt --isPrivateReply]
salesmanchatbot conversations messages update <conversationId> <messageId> --createdAt <createdAt> --newText <newText>
                                                     # [--newAttachmentPath --newAttachmentPublicUrl --newAttachmentMimeType
                                                     #  --newAttachmentName --newAttachmentSize --removeAttachment]
salesmanchatbot conversations message delete <conversationId> <messageId> --createdAt <createdAt>
salesmanchatbot conversations attribute add <conversationId> <messageId> --createdAt <createdAt>  # [--liked --hidden]
```

---

### `broadcasts`

```bash
salesmanchatbot broadcasts list
salesmanchatbot broadcasts get <idOrName>                   # Get broadcast
salesmanchatbot broadcasts audience list <idOrName>         # Get broadcast audience (contacts) [--page --perPage]
salesmanchatbot broadcasts contacts list <id> --eventType <eventType>  # Recipients by delivery event
                                                     # eventType: sent|delivered|read|failed [--page --perPage]
salesmanchatbot broadcasts create --channel <channel> --subaction <subaction> --schedulesType <schedulesType>
                                                     # Cloud trial Messenger broadcasts: max 60/min and one active at a time
                                                     #   --schedulesAt <schedulesAt> --contactFilter <contactFilter>
                                                     #   [--flowId --templateId --integrationWhatsappId --integrationMessengerId
                                                     #    --templateData --buttons --targets --inboxIds --saveAsDraft]
                                                     # Either flowId or templateId required (not both); schedulesAt required
                                                     # when schedulesType is "future" and saveAsDraft is not true
salesmanchatbot broadcasts update <id> --name <name>        # Rename only — use `draft update` to change the payload
salesmanchatbot broadcasts draft update <id>                # Replace a draft's full payload — same fields as `create`
                                                     # (saveAsDraft false schedules it instead of saving as draft)
salesmanchatbot broadcasts schedule add <id> --schedulesType <schedulesType>  # [--schedulesAt --sendRatePerMinute] move draft to scheduled
salesmanchatbot broadcasts move-to-draft add <id>           # scheduled -> draft (404 unless status is scheduled)
salesmanchatbot broadcasts stop add <id>                    # Stop a sending broadcast
salesmanchatbot broadcasts resume add <id>                  # [--sendRatePerMinute] Resume a stopped (cancelled) broadcast
salesmanchatbot broadcasts resend add <id>                  # Clone a sent/failed broadcast into a new scheduled one
salesmanchatbot broadcasts duplicate add <id>               # Copy into a new draft, including targets/audience filter
salesmanchatbot broadcasts delete <id>                      # Soft-delete (fails while status is sending)
```

---

### `flows`

```bash
salesmanchatbot flows list                                  # [--page --perPage --active]  active defaults to true
salesmanchatbot flows get <id>                              # Includes its versions
salesmanchatbot flows create --name <name>                  # [--folderId --spec --nodes --edges --publish]
                                                     # spec: flow-spec DSL (see `schemas flow-spec`); nodes/edges: raw
                                                     # graph (mutually exclusive with spec); publish: create the first
                                                     # version immediately
salesmanchatbot flows update <id>                           # [--name --active --enableInInbox]
salesmanchatbot flows delete <id>
salesmanchatbot flows duplicate add <id>                    # Copy the draft into a new flow
salesmanchatbot flows publish add <id>                      # [--spec | --nodes --edges]  create a version from the draft
salesmanchatbot flows validate --spec <spec>                # Compile/validate a flow-spec DSL without publishing
salesmanchatbot flows draft update <id>                     # [--spec | --nodes --edges]  overwrite the draft in place
salesmanchatbot flows versions list <id>                    # List immutable published versions, newest first
salesmanchatbot flows import --fileId <fileId>              # [--folderId]  queue async import of an uploaded flow-export file
```

---

### `sequences`

```bash
salesmanchatbot sequences list                              # [--page --perPage --sort]
salesmanchatbot sequences get <id>                          # Includes its steps
salesmanchatbot sequences create --name <name>              # [--folderId]  creates an empty sequence
salesmanchatbot sequences update <id>                       # [--name --active]
salesmanchatbot sequences delete <id>                       # Deletes the sequence and all of its steps
salesmanchatbot sequences steps update <id> --order <order>  # Create (omit --stepId) or update (with --stepId) a step
                                                     # [--stepId --delayDays --delayMinutes --delayUnit
                                                     #  --specificDateTime --flowId --isActive --anytime
                                                     #  --sendTimeStart --sendTimeEnd --sendDays]
salesmanchatbot sequences step delete <id> <stepId>         # Remove one step from the sequence
salesmanchatbot sequences contacts list <id> <stepId> --eventType <eventType>  # Recipients by lifecycle event
                                                     # [--page --perPage]
```

---

### `saved-replies`

```bash
salesmanchatbot saved-replies list
salesmanchatbot saved-replies get <id>
salesmanchatbot saved-replies create --shortcut <shortcut> --text <text>
salesmanchatbot saved-replies update <id> --shortcut <shortcut> --text <text>
salesmanchatbot saved-replies delete <id>
```

---

### `whatsapp`

```bash
salesmanchatbot whatsapp templates                          # [--inboxId --integrationWhatsappId --status]
```

---

### `ai-agents`

```bash
salesmanchatbot ai-agents list
salesmanchatbot ai-agents get <id>
salesmanchatbot ai-agents create --name <name> --prompt <prompt> --temperature <temperature>
                                                     #   --maxOutputTokens <maxOutputTokens> --isDefault <isDefault>
                                                     #   --messages <messages> --models <models> --tools <tools>
                                                     # messages: JSON array of {role,content}; models: JSON array of
                                                     # {provider,model} (or {kind:"openaiCompatible",integrationId,model})
                                                     # fallback list, first entry preferred; tools: JSON array of tool names
                                                     # [--webSearchAuthorizedDomains --isRichResponse]
salesmanchatbot ai-agents update <id>                       # Same fields as create, all optional (partial update)
salesmanchatbot ai-agents delete <id>
```

---

### `integrations`

```bash
salesmanchatbot integrations list                           # List integrations
salesmanchatbot integrations get <id>
salesmanchatbot integrations status-token-errors            # Channel integrations with failed token refresh
salesmanchatbot integrations find-by-ai --provider <provider>  # Get AI provider integration (GET only — connect/disconnect
                                                     # PUT/DELETE on the same path collide, see Known command-name collisions)
```

---

### `keywords`

```bash
salesmanchatbot keywords list                               # List keywords (automated responses) [--type]
salesmanchatbot keywords get <id>                           # [--type]  type: inbound|comment, default inbound
salesmanchatbot keywords create --keywords <keywords>       # [--type --text --flowId --folderId]
                                                     # keywords: JSON array of phrases; text or flowId (not both)
salesmanchatbot keywords update <id>                        # [--type --keywords --text --flowId --folderId]
salesmanchatbot keywords status update <id> --status <status>  # [--type]  enable/disable without touching other fields
salesmanchatbot keywords delete <id>                        # [--type]
```

---

### `triggers`

```bash
salesmanchatbot triggers list                               # [--page --perPage]
salesmanchatbot triggers get <id>                           # Includes real conditions/actions
salesmanchatbot triggers create --name <name>               # [--folderId]  creates an empty trigger
salesmanchatbot triggers update <id> --conditions <conditions> --actions <actions>
                                                     # Replaces the full condition/action set — JSON arrays
salesmanchatbot triggers settings update <id>               # [--name --active]  name/active only, conditions untouched
salesmanchatbot triggers delete <id>
```

---

### `webhooks`

```bash
salesmanchatbot webhooks list
salesmanchatbot webhooks create --name <name> --url <url> --conditions <conditions>
                                                     # conditions: JSON array of event conditions, at least one required
salesmanchatbot webhooks delete <id>
```

---

### `error-logs`

```bash
salesmanchatbot error-logs list                             # [--page --perPage --sort --keyword]
```

---

### `ads`

```bash
salesmanchatbot ads conversion-rules                        # List Ads conversion rules
salesmanchatbot ads conversion-rules --event <event> --conversionType <conversionType>
                                                     # Create Ads conversion rule (name collides with list above, see note)
salesmanchatbot ads find-by-conversion-rules <id>           # Get/update/delete conversion rule (GET shown; PATCH/DELETE collide, see note)
                                                     # PATCH body also enables/disables via `enabled` (no separate status command)
salesmanchatbot ads funnel                                  # Get ad conversion funnel
salesmanchatbot ads funnel-timeseries                       # Get daily ad conversion funnel
salesmanchatbot ads capi-delivery                           # Get Conversions API delivery status
salesmanchatbot ads conversions-export                      # Export conversion rows [--allChannels]
salesmanchatbot ads ad-accounts list <channel>               # List channel ad accounts
salesmanchatbot ads analytics-overview                      # Get ad analytics overview
salesmanchatbot ads analytics-timeseries                    # Get daily ad analytics
salesmanchatbot ads find-by-conversions <id>                # Get Ads conversion event
salesmanchatbot ads custom-audiences                        # List custom audiences [--adAccountId]
salesmanchatbot ads retarget-audiences                      # Sync retarget audience

# Messaging ad campaigns
salesmanchatbot ads campaigns                               # List (GET) / create (POST) messaging ad (names collide, see note)
salesmanchatbot ads campaigns-retry <id>                    # Resume messaging ad creation
salesmanchatbot ads campaigns-publish <id>                  # Publish messaging ad
salesmanchatbot ads campaigns-pause <id>                    # Pause published messaging ad
salesmanchatbot ads find-by-campaigns <id>                  # Delete messaging ad campaign/ad set/ad
salesmanchatbot ads campaigns-insights                      # Get messaging ad insights (POST, adIds up to 500)
salesmanchatbot ads campaigns-ad-accounts <channel> <integrationId>  # List integration ad accounts
salesmanchatbot ads find-by-campaigns-ad-accounts <adAccountId>      # Get ad account details
salesmanchatbot ads campaigns-upload-video                  # Upload campaign video
salesmanchatbot ads campaigns-videos-status <videoId>       # Get campaign video status
salesmanchatbot ads campaigns-messenger-pages               # List Messenger pages (whatsapp channel only)
salesmanchatbot ads campaigns-prerequisites                 # Check messaging ads prerequisites
salesmanchatbot ads connections                             # List messaging-ads connections for channel
salesmanchatbot ads find-by-connections <channel> <integrationId>    # Disconnect messaging ads connection
```

---

### `ai-files`

```bash
salesmanchatbot ai-files list                               # List AI knowledge-base files
salesmanchatbot ai-files get <id>
salesmanchatbot ai-files create --name <name>               # [--file --url] (exactly one required)
salesmanchatbot ai-files delete <id>
```

---

### `ai-functions`

```bash
salesmanchatbot ai-functions list
salesmanchatbot ai-functions get <id>
salesmanchatbot ai-functions create --name <name>
salesmanchatbot ai-functions update <id>
salesmanchatbot ai-functions delete <id>
```

---

### `ai-mcp-servers`

```bash
salesmanchatbot ai-mcp-servers list
salesmanchatbot ai-mcp-servers get <id>
salesmanchatbot ai-mcp-servers create --name <name> --url <url>
salesmanchatbot ai-mcp-servers update <id>
salesmanchatbot ai-mcp-servers delete <id>
```

---

### `analytics`

All commands take a time range (`--from --to --timezone`); several also take `--granularity`.

```bash
salesmanchatbot analytics contact-counts-per-day
salesmanchatbot analytics new-contact-counts-per-day
salesmanchatbot analytics blocked-contacts-per-day
salesmanchatbot analytics blocked-contacts-count
salesmanchatbot analytics new-contacts-count
salesmanchatbot analytics contacts-count
salesmanchatbot analytics active-contacts-count
salesmanchatbot analytics contacts-by-dimension --dimension <country|channel|source>
salesmanchatbot analytics messages-by-admin
salesmanchatbot analytics human-agent-stats
salesmanchatbot analytics conversation-handoffs
salesmanchatbot analytics conversation-followups
salesmanchatbot analytics conversation-archived
salesmanchatbot analytics conversation-assigned
salesmanchatbot analytics conversation-assigned-by-admin
salesmanchatbot analytics unique-conversations-by-admin
salesmanchatbot analytics bot-messages-by-result             # [--granularity]
salesmanchatbot analytics bot-messages-with-response          # [--granularity]
salesmanchatbot analytics bot-messages-no-response            # [--granularity]
salesmanchatbot analytics bot-messages-ai-providers
salesmanchatbot analytics messages-by-sender                  # [--granularity]
salesmanchatbot analytics broadcasts-stats <broadcastId>       # Get broadcast stats
salesmanchatbot analytics sequences-steps-stats <sequenceId> <stepId>  # Get sequence step stats
salesmanchatbot analytics mac-active-count                    # No time range — current billing period
salesmanchatbot analytics flows-stats <flowId>                # Get flow analytics (also DELETE resets stats, see note)
salesmanchatbot analytics magic-links-stats --linkId <linkId>
salesmanchatbot analytics magic-links-contacts --linkId <linkId>
salesmanchatbot analytics ref-links-stats --linkId <linkId>
salesmanchatbot analytics ref-links-contacts --linkId <linkId>
```

---

### `appointment-calendars`

```bash
salesmanchatbot appointment-calendars list
salesmanchatbot appointment-calendars get <id>
salesmanchatbot appointment-calendars create --name <name>
salesmanchatbot appointment-calendars update <id>
salesmanchatbot appointment-calendars active update <id> --active <active>
salesmanchatbot appointment-calendars duplicate add <id>
salesmanchatbot appointment-calendars delete <id>
salesmanchatbot appointment-calendars availability list <id> --startDate <startDate> --endDate <endDate> --contactId <contactId>
```

---

### `appointment-external-calendars`

```bash
salesmanchatbot appointment-external-calendars list          # Connected Google/Outlook calendars
salesmanchatbot appointment-external-calendars delete <integrationId>  # Disconnect
```

---

### `appointment-reminders`

```bash
salesmanchatbot appointment-reminders list                   # [--page --perPage --status]
```

---

### `appointments`

```bash
salesmanchatbot appointments list                            # [--calendarId --tab --search --page --perPage]
salesmanchatbot appointments get <id>
salesmanchatbot appointments create --calendarId <calendarId> --contactId <contactId> --startAt <startAt> --inviteeTimezone <inviteeTimezone>
                                                       # [--conversationId]  (book appointment)
salesmanchatbot appointments cancel add <id>
salesmanchatbot appointments delete <id>
```

---

### `capabilities`

```bash
salesmanchatbot capabilities list                            # [--include --channel]  Discover workspace ids/names and channel flow policy
```

---

### `schemas`

```bash
salesmanchatbot schemas flow-spec                            # JSON Schema for the flow-spec DSL
```

---

### `contact-scans`

```bash
salesmanchatbot contact-scans status --inboxId <inboxId>     # Latest Automatic Customer Scan status for inbox
salesmanchatbot contact-scans list                           # [--page --perPage]
salesmanchatbot contact-scans create --inboxId <inboxId> --scanFromAt <scanFromAt>
```

---

### `coupon-topics` / `coupons`

```bash
salesmanchatbot coupon-topics list                           # [--page --perPage]
salesmanchatbot coupon-topics get <id>
salesmanchatbot coupon-topics create --name <name>
salesmanchatbot coupon-topics update <id>
salesmanchatbot coupon-topics archive add <id>
salesmanchatbot coupon-topics unarchive add <id>
salesmanchatbot coupon-topics delete <id>
salesmanchatbot coupons list                                 # [--topicId --status --usage --keyword --page --perPage]
salesmanchatbot coupon-topics issue add <id> --contactId <contactId>       # Issue coupon to contact
salesmanchatbot coupon-topics mark-used add <id> --contactId <contactId>   # Mark issued coupon as used
salesmanchatbot coupon-topics bulk add <topicId> --codes <codes>  # Add coupon codes to a topic
salesmanchatbot coupon-imports upload-url --fileName <name> --mimeType text/csv --size <bytes>
salesmanchatbot coupon-imports create --topicId <id> --fileId <id>
salesmanchatbot coupon-exports create                         # [--topicId --issueStatus --usageStatus --search]
salesmanchatbot coupon-exports get <fileId>                   # Poll a CSV export and obtain its download URL
```

Coupons issued to a specific contact are listed via `contacts coupons list <identifier>` (see `contacts` above).
For CSV imports, use `coupon-imports upload-url`, upload the bytes directly to
the returned URL, then call `coupon-imports create`. MCP clients that only
support JSON tool calls should use `coupon-topics bulk add` instead.

`coupons list` also accepts legacy flags `--issueStatus`, `--usageStatus`, and
`--search`; do not send a legacy flag together with its corresponding PDF name.

---

### `dynamic-images`

```bash
salesmanchatbot dynamic-images list                          # [--page --perPage --name]
salesmanchatbot dynamic-images get <id>
salesmanchatbot dynamic-images create --name <name>
salesmanchatbot dynamic-images update <id>
salesmanchatbot dynamic-images delete <id>
salesmanchatbot dynamic-images enabled update <id> --enabled <enabled>
```

---

### `email-topics`

```bash
salesmanchatbot email-topics list
salesmanchatbot email-topics get <id>
salesmanchatbot email-topics create --name <name>
salesmanchatbot email-topics update <id>
salesmanchatbot email-topics delete <id>
```

---

### `external-webhooks`

```bash
salesmanchatbot external-webhooks list
salesmanchatbot external-webhooks create --url <url> --event <event>  # [--provider make|n8n]
salesmanchatbot external-webhooks delete <id>
```

---

### `facebook-lead-ads`

```bash
salesmanchatbot facebook-lead-ads list
salesmanchatbot facebook-lead-ads get <id>
salesmanchatbot facebook-lead-ads create --pageId <pageId> --formId <formId>
salesmanchatbot facebook-lead-ads update <id>
salesmanchatbot facebook-lead-ads delete <id>
salesmanchatbot facebook-lead-ads pages                      # List eligible Messenger pages
salesmanchatbot facebook-lead-ads forms --pageId <pageId>    # List a page's lead forms
```

---

### `fb-comments`

```bash
salesmanchatbot fb-comments list
salesmanchatbot fb-comments get <id>
salesmanchatbot fb-comments create
salesmanchatbot fb-comments update <id>
salesmanchatbot fb-comments delete <id>
salesmanchatbot fb-comments facebook-posts                   # List eligible Facebook posts
```

---

### `folders`

```bash
salesmanchatbot folders list --folderType <tag|customField>  # [--parentId]
salesmanchatbot folders create --name <name> --folderType <tag|customField>  # [--parentId]
salesmanchatbot folders update <id> --name <name>
salesmanchatbot folders delete <id>
```

---

### `ig-comments`

```bash
salesmanchatbot ig-comments list
salesmanchatbot ig-comments get <id>
salesmanchatbot ig-comments create
salesmanchatbot ig-comments update <id>
salesmanchatbot ig-comments delete <id>
salesmanchatbot ig-comments instagram-media --variant <instagram|facebook>  # List eligible media
```

---

### `ig-stories`

```bash
salesmanchatbot ig-stories list
salesmanchatbot ig-stories get <id>
salesmanchatbot ig-stories create
salesmanchatbot ig-stories update <id>
salesmanchatbot ig-stories delete <id>
salesmanchatbot ig-stories instagram-stories --variant <instagram|facebook>  # List eligible stories
```

---

### `inboxes`

```bash
salesmanchatbot inboxes list                                 # Connected inboxes; use `id` as `inboxId` elsewhere
salesmanchatbot inboxes update <id> --markReadOnOutbound <true|false>
```

---

### `media-library`

```bash
salesmanchatbot media-library folders                        # List (GET) / create (POST) folders (names collide, see note)
salesmanchatbot media-library find-by-folders <folderId>      # Rename (PUT) / delete+contents (DELETE), collide, see note
salesmanchatbot media-library files-upload-url --fileName <fileName> --mimeType <mimeType>  # Get presigned upload URL
salesmanchatbot media-library files                           # List (GET) / register uploaded file (POST), collide, see note
salesmanchatbot media-library find-by-files <fileId>          # Get (GET) / delete (DELETE) file, collide, see note
salesmanchatbot media-library files-favourite <fileId> --isFavourite <isFavourite>
salesmanchatbot media-library files-access <fileId>           # Record file access
salesmanchatbot media-library files-move --fileIds <fileIds>  # [--folderId]
```

---

### `inboxes` AI hand-over (Meta Business AI, scope `integrations`)

```bash
salesmanchatbot inboxes settings list <inboxId>                  # AI hand-over settings
salesmanchatbot inboxes settings update <inboxId> --enabled --scheduleEnabled --timeRanges --gotoFlowId --returnMessage --pauseBotWaitingForStaff
salesmanchatbot inboxes apply-to-all list <inboxId>              # Switch state + latest run
salesmanchatbot inboxes apply-to-all add <inboxId> --applyToAllCustomers --message <text> --dryRun        # Count only
salesmanchatbot inboxes apply-to-all add <inboxId> --applyToAllCustomers --message <text> --confirmCount <n>
salesmanchatbot inboxes retry add <inboxId>                      # Retry the latest apply-to-all
salesmanchatbot inboxes history list <inboxId>                   # [--page --perPage]
```

### Conversation thread control (scope `inbox`)

```bash
salesmanchatbot conversations thread-control add <id> --contactInboxId <id> --action take|release|pass
salesmanchatbot conversations sync add <id> --contactInboxId <id>     # Sync the thread owner from the channel
```

### `workspace` settings (scope `settings`)

```bash
salesmanchatbot workspace settings get                       # Get workspace settings
salesmanchatbot workspace settings update --defaultReply --defaultReplyFrequency --smartResponseDelaySeconds --capiLimitedDataUse --logo
```

### `whatsapp` calls (scope `integrations`)

```bash
salesmanchatbot whatsapp calls                              # [--activity --inboxId --agentUserId --cursor]
salesmanchatbot whatsapp calls-recording <id>               # 15-minute signed playback URL
salesmanchatbot whatsapp calls-transcript <id>
salesmanchatbot whatsapp calls-summary <id>
salesmanchatbot whatsapp templates-catalog-products         # [--keyword] Meta Catalog product search
salesmanchatbot whatsapp-channels sync add <id>             # Sync WhatsApp templates from Meta
salesmanchatbot whatsapp-channels dataset update <id> --datasetId <id>      # CAPI dataset (also instagram/messenger)
salesmanchatbot whatsapp-channels test-event-code update <id> --testEventCode <code>         # "" clears it
salesmanchatbot whatsapp-channels test-event add <id> --messagingId <id>
```

### `channel-integrations`

```bash
salesmanchatbot channel-integrations list                    # [--channel] Connected WhatsApp/Messenger/Instagram/Zalo/TikTok channels
salesmanchatbot whatsapp-channels list|get <id>              # Same data per channel; also instagram-channels, tiktok-channels
salesmanchatbot whatsapp-channels handover-resume-flow update <id> --handoverResumeFlowId <flowId|null>
```

### `messenger-channels`

```bash
salesmanchatbot messenger-channels list
salesmanchatbot messenger-channels get <id>
salesmanchatbot messenger-channels handover-resume-flow update <id> --handoverResumeFlowId <flowId|null>
salesmanchatbot messenger-channels tag-sync update <id> --enabled <enabled>
```

---

### `messenger-personas`

```bash
salesmanchatbot messenger-personas list                       # Personas across every connected page
```

---

### `minigames`

```bash
salesmanchatbot minigames list                                # [--page --perPage]
salesmanchatbot minigames get <id>
salesmanchatbot minigames create --name <name> --type <type>
salesmanchatbot minigames update <id>                          # Full replace (PUT) / partial (PATCH) collide, see note
salesmanchatbot minigames delete <id>
salesmanchatbot minigames bulk-delete --ids <ids>
salesmanchatbot minigames enabled update <id> --enabled <enabled>
salesmanchatbot minigames plays list <id> --contactId <contactId>   # Contact's play records
salesmanchatbot minigames players list <id>                    # Contacts who played, with counts/prizes
```

---

### `product-categories`

```bash
salesmanchatbot product-categories list
salesmanchatbot product-categories create --name <name>       # [--parentId --rank]
salesmanchatbot product-categories update <id>                 # [--name --parentId]
salesmanchatbot product-categories delete <id>
```

---

### `products`

```bash
salesmanchatbot products list                                 # [--page --perPage]
salesmanchatbot products get <id>
salesmanchatbot products create --name <name>
salesmanchatbot products update <id>                           # Full replace
salesmanchatbot products delete <id>
salesmanchatbot products import-template                       # XLSX template as base64 [--language]
salesmanchatbot products imports-upload-url --fileName <name> --mimeType <mime> --fileSize <bytes>
salesmanchatbot products imports-files-headers <fileId>
```

---

### `qr-codes`

```bash
salesmanchatbot qr-codes list
salesmanchatbot qr-codes get <id>
salesmanchatbot qr-codes create --name <name>
salesmanchatbot qr-codes update <id>
salesmanchatbot qr-codes delete <id>
```

---

### `questionnaires`

```bash
salesmanchatbot questionnaires list
salesmanchatbot questionnaires get <id>
salesmanchatbot questionnaires create --name <name>
salesmanchatbot questionnaires update <id>                     # Full replace
salesmanchatbot questionnaires delete <id>
salesmanchatbot questionnaires rename update <id> --name <name>
salesmanchatbot questionnaires duplicate add <id>
salesmanchatbot questionnaires submissions list <id>           # [--page --perPage]
salesmanchatbot questionnaires submission get <id> <submissionId>
salesmanchatbot questionnaires submission delete <id> <submissionId>
salesmanchatbot questionnaires stats list <id>                 # Submission/completion stats
```

---

### `ref-links`

```bash
salesmanchatbot ref-links list
salesmanchatbot ref-links get <id>
salesmanchatbot ref-links create --name <name>
salesmanchatbot ref-links update <id>
salesmanchatbot ref-links delete <id>
```

---

### `smtp-integrations`

```bash
salesmanchatbot smtp-integrations list
salesmanchatbot smtp-integrations get <id>
salesmanchatbot smtp-integrations create --username <username> --password <password> --fromAddress <fromAddress>
                                                        # [--provider]
salesmanchatbot smtp-integrations update <id>
salesmanchatbot smtp-integrations delete <id>
```

---

### `spreadsheets`

```bash
salesmanchatbot spreadsheets list
salesmanchatbot spreadsheets get <id>
salesmanchatbot spreadsheets create --url <url>               # Connect a Google Sheets spreadsheet
salesmanchatbot spreadsheets update <id>
salesmanchatbot spreadsheets delete <id>
salesmanchatbot spreadsheets worksheets list <id>
salesmanchatbot spreadsheets headers list <id> <worksheetName>
```

---

### `token`

```bash
salesmanchatbot token list                                    # Calling token's workspaceId, permission, and scopes
```

---

### `user-persistent-menus`

```bash
salesmanchatbot user-persistent-menus list
salesmanchatbot user-persistent-menus get <id>
salesmanchatbot user-persistent-menus create --name <name> --persistentMenus <persistentMenus>
salesmanchatbot user-persistent-menus update <id>
salesmanchatbot user-persistent-menus delete <id>
```

---

### `webchats`

```bash
salesmanchatbot webchats list
salesmanchatbot webchats get <id>
salesmanchatbot webchats create --name <name>
salesmanchatbot webchats update <id>
salesmanchatbot webchats delete <id>
```

---

### `zalo-channels`

```bash
salesmanchatbot zalo-channels list|get <id>
salesmanchatbot zalo-channels tag-sync update <id> --enabled <enabled>
```

---

## Known command-name collisions

Commands are named by `pathAndMethodToCommandName` (`apps/cli/src/openapi-loader.ts`) from `{path, method}` alone, ignoring the router's own action key. When two operations under the same resource reduce to the same name, `toolsToCommands` keeps the first and silently drops the second (a `Warning: duplicate command name "..." — skipping` line on stderr). Every entry below was verified against source, not just the stderr warning.

| Command name | Colliding operations | What's reachable |
|---|---|---|
| `ads:conversion-rules` | `POST` (create) vs `GET` (list) `/v1/ads/conversion-rules` | Only `list` |
| `ads:find-by-conversion-rules` | `PATCH` vs `DELETE` `/v1/ads/conversion-rules/{id}` | Only one (whichever registers first) |
| `ads:campaigns` | `GET` (list) vs `POST` (create) `/v1/ads/campaigns` | Only `list` |
| `analytics:flows-stats` | `GET` (get stats) vs `DELETE` (reset stats) `/v1/analytics/flows/{flowId}/stats` | Only `get` |
| `media-library:folders` | `POST` (create) vs `GET` (list) `/v1/media-library/folders` | Only `list` |
| `media-library:find-by-folders` | `PUT` (rename) vs `DELETE` (delete+contents) `/v1/media-library/folders/{folderId}` | Only one |
| `media-library:files` | `POST` (register) vs `GET` (list) `/v1/media-library/files` | Only `list` |
| `media-library:find-by-files` | `GET` vs `DELETE` `/v1/media-library/files/{fileId}` | Only `get` |
| `minigames:update` | `PUT` (full) vs `PATCH` (partial) `/v1/minigames/{id}` | Only one |
| `bot-fields:update` | `PUT /v1/bot-fields/{idOrName}` (`set`, single field) vs `PUT /v1/bot-fields` (`setMany`, several by name) | Only `setMany` — use `bot-fields update --fields <fields>` even for a single field |
| `contacts:custom-fields:update` | `PATCH /v1/contacts/{identifier}/custom-fields` (`applyCustomFieldOperations`, batch) vs `PUT .../custom-fields/{idOrName}` (`setCustomField`, single field) | Only `applyCustomFieldOperations` — use `contacts custom-fields update <identifier> --operations '[{"customFieldId":"...","operation":"set","value":"..."}]'` for a single field too |
| `contacts:custom-field:delete` | `DELETE .../custom-fields/{idOrName}` (`clearCustomField`, one field) vs `DELETE .../custom-fields` (`clearCustomFields`, every field) | Only `clearCustomFields` — `contacts custom-field delete <identifier>` clears **every** custom field, not one |
| `integrations:find-by-ai` | `GET`/`PUT`/`DELETE /v1/integrations/ai/{provider}` (get/connect/disconnect) | Only `GET` — connecting or disconnecting an AI provider has no CLI command |

Root cause for the `bot-fields`, `contacts:custom-field(s)`, and `integrations:find-by-ai` rows: `pathAndMethodToCommandName`'s remainder branch derives `${group}:${subResource}:update` (or its GET/DELETE equivalents) without folding the HTTP method into the name when a literal second path segment is followed by a param — unlike the sibling GET/DELETE branches, which already do this for the two-segment case.

All of these operations remain reachable over HTTP directly; only the CLI's generated command for the losing operation is missing.

## Caching

The CLI caches the API spec at `~/.chatbotX/openapi-cache.json` for 1 hour to avoid fetching on every run.

```bash
# Force refresh the spec cache
salesmanchatbot --refresh-spec <command>

# Or delete the cache manually
rm ~/.chatbotX/openapi-cache.json
```

Cache TTL can be overridden via environment variable:

```bash
SALESMANCHATBOT_SPEC_CACHE_TTL_SECONDS=300 salesmanchatbot tags list
```

---

## Getting Help

```bash
salesmanchatbot --help                          # List all command groups
salesmanchatbot contacts --help                 # List actions for a group
salesmanchatbot contacts message --help         # List subactions
salesmanchatbot contacts message send --help    # Show options for a specific action
```

---

## Releasing (maintainers)

`salesmanchatbot` on npm is published automatically by `.github/workflows/publish-cli.yml` when a `v*` release tag is pushed: tag `v1.9.0` publishes `salesmanchatbot@1.9.0`. A tag with a prerelease suffix (`v2.0.0-rc.1`) publishes under the `next` dist-tag instead of `latest`.

`version` in `apps/cli/package.json` is intentionally the placeholder `0.0.0-dev` — the workflow stamps the tag's version in before building, so it is never committed. Do not publish by hand; use the workflow's `Run workflow` button (with `dry_run` to rehearse) if you need an off-cycle release.
