# Order Intake Session বাস্তবায়ন পরিকল্পনা

## Summary

বর্তমান AI order flow-তে `start_order_draft` একই conversation-এর সর্বশেষ draft ফেরত দেয় এবং অন্য order tools `orderId` ছাড়া newest `draft`/`awaiting_confirmation` order update করে। ফলে একই conversation-এ customer নতুন order চাইলে পুরোনো order overwrite হওয়ার ঝুঁকি আছে।

নতুন design-এ `Order` তৈরি হবে **শুধু valid phone number প্রথম পাওয়া গেলে**। ফোন পাওয়ার আগ পর্যন্ত normal AI conversation চলবে, কিন্তু durable `OrderConversationSession`-এ intake data থাকবে। সকল required information পূর্ণ হলে বর্তমান lifecycle-এর `awaiting_confirmation` status ব্যবহার হবে। Customer নতুন order intent করলে নতুন intake session তৈরি হবে; কোনো পুরোনো order auto-update হবে না।

## Current State Analysis

- [packages/business/src/order/service.ts](file:///d:/Downloads/chatbotx-salesmanchatbot-main/chatbotx-salesmanchatbot-main/packages/business/src/order/service.ts#L40-L48)-এ `startDraft()` conversation-এর existing draft ফেরত দেয়, তাই নতুন intent-ও পুরোনো row reuse করে।
- [apps/worker/src/integration/handlers/automated-response/system-tools/orders.ts](file:///d:/Downloads/chatbotx-salesmanchatbot-main/chatbotx-salesmanchatbot-main/apps/worker/src/integration/handlers/automated-response/system-tools/orders.ts#L17-L20)-এর `currentDraft()` newest `draft`/`awaiting_confirmation` order বেছে নেয়; update, confirmation, confirm ও cancel-এর optional `orderId` fallback সেই ambiguous row-তে যায়।
- [packages/ai/src/server/tools/system-functions.ts](file:///d:/Downloads/chatbotx-salesmanchatbot-main/chatbotx-salesmanchatbot-main/packages/ai/src/server/tools/system-functions.ts#L135-L159)-এর AI order schema-য় canonical phone নেই এবং `start_order_draft` সরাসরি order create/reuse semantics বহন করে।
- [packages/database/src/schema/order.ts](file:///d:/Downloads/chatbotx-salesmanchatbot-main/chatbotx-salesmanchatbot-main/packages/database/src/schema/order.ts#L45-L75)-এ `Order` draft lifecycle-এর জন্য উপযুক্ত, তবে phone-পূর্ব intake/session data রাখার আলাদা entity নেই।
- [apps/worker/src/integration/handlers/automated-response/replies.ts](file:///d:/Downloads/chatbotx-salesmanchatbot-main/chatbotx-salesmanchatbot-main/apps/worker/src/integration/handlers/automated-response/replies.ts#L192-L201)-এর latest-message policy ইতোমধ্যে latest named product-কে new request হিসেবে ধরে; order-intake tool policy-তে এটিকে explicit session rule হিসেবে যোগ করতে হবে।

## Assumptions & Decisions

1. **Persistent intake state:** User-approved নতুন `OrderConversationSession` table ব্যবহার হবে; `Conversation.additionalAttributes` বা Redis AI context business-state হিসেবে ব্যবহার হবে না।
2. **Phone gate:** Valid phone number ছাড়া `Order` row তৈরি হবে না। Intake session-এ অন্যান্য collected field রাখা যাবে।
3. **Phone handling:** Phone হবে canonical `customerSnapshot.phone` field; tool boundary-তে trim ও validation হবে। Contact profile mutate করা এই scope-এর অংশ নয়।
4. **Ready status:** সব type-specific required canonical field এবং workspace required custom field পূর্ণ হলে order `draft → awaiting_confirmation` হবে। কোনো নতুন `active` enum যোগ হবে না; existing UI aggregate active group অপরিবর্তিত থাকবে।
5. **New intent:** AI explicit fresh session শুরু করবে। পুরোনো session/order retain হবে, auto-cancel বা auto-update হবে না।
6. **Targeting:** Existing order mutate/confirm/cancel করার সময় `orderId` mandatory। "newest draft" fallback সম্পূর্ণ বাদ যাবে।
7. **One session to one order:** একটি intake session সর্বোচ্চ একটি Order bind করতে পারবে। প্রতিটি new intent একটি নতুন session পাবে।
8. **No migration apply:** Migration তৈরি ও inspect করা হবে; `db:migrate` user-এর explicit approval ছাড়া চালানো হবে না।

## Proposed Changes

### 1. Intake session persistence layer

**New files**

- `packages/database/src/partials/order-intake-session.ts`
- `packages/database/src/schema/order-intake-session.ts`
- `packages/database/src/relations/order-intake-session.ts`
- `packages/database/src/repositories/order-intake-session/repository.ts`
- `packages/database/src/repositories/order-intake-session/index.ts`
- `packages/business/src/order-intake-session/service.ts`
- `packages/business/src/order-intake-session/index.ts`
- `packages/business/__tests__/order-intake-session-service.test.ts`

**Registration updates**

- `packages/database/src/partials/index.ts`
- `packages/database/src/schema/index.ts`
- `packages/database/src/types.ts`
- `packages/database/src/relations/index.ts` — relation file import **এবং** `relations` object-এ spread দুইটিই যুক্ত হবে।
- `packages/database/src/repositories/index.ts`
- `packages/business/src/index.ts`

**Schema**

`OrderConversationSession` workspace, conversation ও optional contact-এর সঙ্গে bind হবে। এতে থাকবে:

- `state`: `collecting`, `draft_created`, `completed`, `abandoned`, `expired`
- `intentMessageId`: যেই inbound message নতুন order intent শুরু করেছিল; retry idempotency-এর জন্য workspace+conversation+intent message-এ unique constraint
- `collectedData`: phone, customer name, address, product, quantity, price এবং custom field values সহ pre-order fields
- `orderId`: nullable FK; phone পাওয়ার পরে create হওয়া Order-এর link; unique nullable
- `version`: optimistic update guard
- `expiresAt`, `closedAt`

Indexes: workspace + conversation + created time এবং workspace + conversation + state। PII-carrying `collectedData` এর জন্য explicit expiry থাকবে। JSONB default ব্যবহার করা হবে না; create-তে empty object explicitly pass হবে।

**Repository**

Raw persistence methods যোগ হবে:

- idempotent `createForIntent`
- workspace-scoped `findById`
- session-bound Order lookup
- version-guarded `update`
- session/order bind

সব methods workspace scope enforce করবে। Repository-তে validation, event বা business decision থাকবে না।

**Business service**

`OrderIntakeSessionService` থাকবে `action/tool executor → service → repository → DB` boundary অনুযায়ী:

- `startNewIntent`: incoming intent message ID দিয়ে idempotently fresh `collecting` session তৈরি/ফেরত দেবে; পুরোনো session/order অপরিবর্তিত থাকবে।
- `recordDetails`: session-এর collected data merge করবে এবং phone normalization/validation করবে।
- `createDraftWhenPhonePresent`: একটি transaction-এ valid phone থাকা নিশ্চিত করবে, bound order না থাকলে নতুন `Order` `draft` create করবে, `orderId` bind করবে এবং session `draft_created` করবে। একই session retry-তে bound order ফেরত দেবে।
- `updateBoundDraft`: bound `orderId` ছাড়া update হতে দেবে না; collected canonical/custom fields Order service-এ pass করবে।
- `requestConfirmationWhenComplete`: Order service-এর completeness check pass হলে `requestConfirmation` call করবে এবং session `completed` করবে।
- `get`: AI tool-কে session, bound order ও missing canonical fields দিতে পারে।

Service transaction-এর মধ্যে session mutation ও Order creation/binding করবে। Worker কখনও direct DB/repository import করবে না।

### 2. Order service semantics ও completeness

**Files**

- `packages/business/src/order/service.ts`
- `packages/database/src/repositories/order/repository.ts`
- `packages/business/__tests__/order-service.test.ts`

**Changes**

- AI-specific create path-এর জন্য `startDraft()`-এর conversation-wide `findActiveDraft()` reuse বন্ধ করা হবে। Session service নতুন draft create করবে এবং session idempotency ownership রাখবে। Existing non-AI callers থাকলে তাদের behavior preserve করতে a separate explicit `createDraft`/`findOrCreateDraft` API রাখা হবে; ambiguous reuse AI path ব্যবহার করবে না।
- `OrderService`-এ `getCompleteness` বা internal canonical checker যোগ হবে। Product order-এর জন্য phone, `customer_name`, `delivery_address`, product name, positive quantity ও valid total required হবে; workspace-defined required custom field validation বর্তমান `requestConfirmation` logic থেকে reuse হবে। Appointment ও quote type-এর existing detail schemas একই type-aware checker-এ থাকবে।
- `requestConfirmation` missing requirement থাকলে field-wise validation error দেবে; complete হলে existing `awaiting_confirmation` transition বজায় রাখবে।
- `updateDraft` canonical snapshot-এ `phone` support করবে। Existing order update শুধুই supplied `orderId`-তে হবে।
- Existing product `replaceItems` behavior এই scope-এ item-level redesign করা হবে না; intake session কাজ শেষ হলে multi-item behaviour আলাদা scope হিসেবে বিবেচিত হবে।

### 3. AI system tool contract redesign

**Files**

- `packages/ai/src/constants/index.ts`
- `packages/ai/src/server/tools/system-functions.ts`
- `apps/worker/src/integration/handlers/automated-response/system-tools/orders.ts`

**Tool changes**

Order intake ও actual order mutation আলাদা হবে:

- `start_order_intake`: `intentMessageId`, type, optional currency নেয়; Order তৈরি করে না।
- `update_order_intake`: explicit `sessionId` ও collected details নেয়; phone valid হলে server session থেকে draft create/bind করতে পারে। Response-এ `session`, `order` (phone-এর আগে null) ও missing fields থাকে।
- `get_current_order_intake`: explicit current session details দেয়; fallback করে newest order নেয় না।
- `update_order_draft`, `request_order_confirmation`, `confirm_order`, `cancel_order_draft`: `orderId` mandatory করা হবে।
- `get_order_details`: explicit order ID behavior অপরিবর্তিত থাকবে।

যদি new names catalog/configuration migration-এর জন্য compatibility লাগে, deprecated tool aliases রাখা হবে না; AI agent configuration/system function registry এক batch-এ নতুন IDs ব্যবহার করবে যাতে obsolete create semantics আর available না থাকে।

**Executor changes**

- `currentDraft()` এবং সব implicit newest-order fallback অপসারণ হবে।
- intake tools শুধু `orderIntakeSessionService` call করবে।
- draft update ও lifecycle tools শুধু supplied `orderId` দিয়ে `orderService` call করবে।
- tool response AI-কে explicit `sessionId`, `orderId`, completeness এবং missing details দেবে, যাতে AI normal কথোপকথনের সময় সঠিক target ধরে রাখতে পারে।
- Existing structured logging pattern (`logger.error({ err: ... })`) বজায় থাকবে।

### 4. AI instruction policy

**File**

- `apps/worker/src/integration/handlers/automated-response/replies.ts`

**Changes**

`CURRENT_MESSAGE_PRIORITY_POLICY`-এর পাশে order-tool policy যোগ হবে:

- User-কে আলাদা করে "order শুরু করতে number দিন" বলা বাধ্যতামূলক নয়; normal conversation-এর context অনুযায়ী প্রয়োজনীয় detail চাইবে।
- নতুন product/new order/"আরেকটা"/"নতুন order" language = `start_order_intake`; previous order details copy বা update করবে না।
- Current intake-এর missing detail হলে ওই explicit session update করবে।
- Phone ছাড়া `Order` নেই; system tool-এর server invariant মেনে চলবে।
- একাধিক intent বা target unclear হলে update না করে clarification চাইবে।
- Details complete হলে `request_order_confirmation`; confirmation ছাড়া `confirmed` করবে না।

এই policy latest-message rule-এর সঙ্গে যুক্ত থাকবে, কিন্তু correctness server-side tool/service invariant দিয়ে নিশ্চিত করা হবে।

### 5. Migration

**Generated path**

- `packages/database/drizzle/<timestamp>_add_order_intake_sessions/migration.sql`
- matching Drizzle metadata/snapshot files generated by the repository toolchain

Schema change শেষ হলে `pnpm --filter @chatbotx.io/database make:migration add-order-intake-sessions` দিয়ে migration generate করে SQL inspect করা হবে। Migration apply করা হবে না যতক্ষণ না user explicit approval দেন।

### 6. Tests

**Business tests**

- `packages/business/__tests__/order-intake-session-service.test.ts`
  - phone ছাড়া new intent session তৈরি করে কিন্তু `Order` create করে না
  - valid phone first received হলে transaction-এ একটি draft create ও session bind করে
  - tool/message retry একই session ও bound order ফেরত দেয়; duplicate row করে না
  - new intent একই conversation-এ নতুন session দেয় এবং পুরোনো draft untouched থাকে
  - old `awaiting_confirmation` order থাকলেও fresh intake ভুল target করে না
  - stale session version/concurrent write safely rejects বা retry-safe result দেয়
  - expire/abandon হওয়া session old order fallback করে না

- `packages/business/__tests__/order-service.test.ts`
  - AI path আর conversation newest-draft reuse করে না
  - phone/custom/canonical completeness requirement না পূরণ হলে confirmation reject হয়
  - complete product order `awaiting_confirmation`-এ transition করে

**Worker tool integration tests**

- `apps/worker/__tests__/automated-response-order-tools.test.ts`
  - intake start Order service call করে না
  - phone intake update session service-এর draft-bind path চালায়
  - existing order mutations explicit `orderId` ছাড়া schema validation-এ fail হয়
  - new intent পুরোনো `orderId` pass করে না
  - executor error response এবং `err` structured log pattern বজায় থাকে

## Verification

ক্রম অনুযায়ী চালানো হবে:

1. `pnpm lint`
2. `pnpm --filter @chatbotx.io/database check-types`
3. `pnpm --filter @chatbotx.io/business check-types`
4. `pnpm --filter worker check-types`
5. `pnpm --filter @chatbotx.io/business test -- order-intake-session-service order-service`
6. `pnpm --filter worker test -- automated-response-order-tools`
7. প্রয়োজন হলে affected package coverage gate, threshold bypass ছাড়া
8. `pnpm --filter @chatbotx.io/database db:check-drift` বা root lint দ্বারা schema/migration consistency নিশ্চিত করা

`db:migrate` এই plan-এর verification command নয় এবং explicit user approval ছাড়া চলবে না.
