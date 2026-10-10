# Full Orders System পরিকল্পনা

## Summary

বর্তমান main project-এর জন্য একটি পূর্ণাঙ্গ, workspace-scoped Orders system পরিকল্পনা করা হবে। এটি একই Orders surface-এ AI agent-এর draft/confirmed order, website/landing-page import, social-channel order এবং manual order একত্র করবে। E-commerce product order হবে প্রথম transaction type; appointment booking এবং আসল diamond-এর quotation/review flow একই platform-এ আলাদা transaction type হিসেবে থাকবে। Pathao, Steadfast, RedX এবং অন্যান্য courier-এ one-click shipment booking, tracking/status sync এবং courier-risk signal পরে একই order lifecycle-এর fulfillment অংশ হবে।

UI-তে Draft Orders এবং Active Orders আলাদা tab থাকবে, কিন্তু database-এ একটি status-driven order aggregate থাকবে যাতে duplicate order, incomplete conversation, existing-order question এবং external sync নির্ভরযোগ্যভাবে handle করা যায়।

## Current State Analysis

- Orders tab-এর navigation আগে থেকেই আছে: `apps/builder/src/features/products/components/ecommerce-tabs.tsx` `/space/[workspaceId]/orders`-এ link দেয়, কিন্তু Orders page/CRUD implementation নেই।
- Products end-to-end reference হিসেবে ব্যবহার হবে: `apps/builder/src/app/space/[workspaceId]/(e-commerce)/products/page.tsx`, `apps/builder/src/features/products/products-table.tsx`, `products-table-columns.tsx`, `schema/query.ts`, `schema/resource.ts`, product actions, `packages/business/src/product/service.ts`, এবং `packages/database/src/repositories/product/repository.ts`।
- Product schema-তে price, tax, discount, currency, SKU, inventory policy/quantity, variants/addons সম্পর্কিত data আছে; তবে order-line price/name snapshot, stock reservation বা checkout lifecycle নেই।
- Appointment-এর lifecycle, cancellation, permission এবং concurrency reference হিসেবে `apps/builder/src/features/appointment-management/*`, `packages/business/src/appointment/service.ts`, `packages/database/src/repositories/appointment/repository.ts` এবং appointment tests ব্যবহার হবে। Existing appointment booking service পুনরায় ব্যবহার হবে; সাধারণ product order-এ appointment logic মেশানো হবে না।
- AI system tool catalog/schema/executor pattern আছে: `packages/ai/src/constants/index.ts`, `packages/ai/src/server/tools/system-functions.ts`, `packages/ai/src/server/toolset.ts`, `apps/worker/src/integration/handlers/automated-response/system-tools/ecommerce.ts`, `apps/worker/src/integration/handlers/automated-response/replies.ts`, এবং `apps/worker/src/integration/handlers/shared/ai-agent-runner.ts`। বর্তমানে product search/details আছে; order mutation tools নেই।
- Shared AI runner ও automated-response path-এ executor/context injection একরকম নয়; নতুন order tools সব relevant runner-এ কার্যকর করতে explicit executor wiring যাচাই করতে হবে।
- External/public API patterns: product authorized/public API, `apps/builder/src/orpc.ts`, router registration এবং public webhook routing। নতুন public order intake/webhook হলে একই auth, workspace token, signature verification এবং public route rules অনুসরণ করতে হবে।
- Existing external webhook service/worker matcher/executor আছে, কিন্তু order import ও courier status sync-এর জন্য idempotency, event ordering এবং retry behavior আলাদাভাবে design করতে হবে।
- Builder navigation-এ ecommerce permission route ও existing `orders` translation key আছে; user-facing strings `useTranslations()` দিয়ে যোগ করতে হবে।
- নতুন code-এর data-access chain হবে: app/API/integration → `packages/business` service → database repository → database schema। App/integration থেকে direct DB import করা যাবে না।

## Proposed Changes

### Phase 1 — Domain contract এবং database foundation

1. নতুন order domain-এর shared enums/contract নির্ধারণ করা:
   - `orderType`: `product`, `appointment`, `quote`, `digital_service`;
   - `orderStatus`: `draft`, `awaiting_confirmation`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `returned`, `refunded`, `failed`, `expired`;
   - `orderSource`: `ai`, `website`, `landing_page`, `messenger`, `instagram`, `whatsapp`, `manual`, `api`;
   - quote/appointment-এ প্রয়োজনীয় subtype ও fulfillment statuses।
2. Order aggregate schema তৈরি করা:
   - workspace/contact/conversation relation;
   - source এবং external order identity;
   - currency, subtotal, delivery fee, discount, total;
   - customer snapshot এবং typed custom field values;
   - confirmation metadata, expiry, timestamps;
   - `source + externalOrderId` idempotency constraint যেখানে external ID আছে।
3. Child tables তৈরি করা:
   - order items-এ product/variant reference, product name/SKU/price/quantity snapshot;
   - order custom field values;
   - order status history/audit events;
   - external order mapping/raw payload metadata;
   - shipment/consignment relation এবং courier status history;
   - optional quote/appointment metadata, যাতে appointment মূল appointment service-এর source record-এর সঙ্গে linked থাকে।
4. Custom order-field definition model তৈরি করা:
   - workspace/order type scoped key, label, type, required, options, AI visibility, customer-editability এবং display order;
   - supported field types: text, phone, email, number, currency, date/datetime, select/multiselect, address, product, variant, boolean, textarea;
   - unsafe arbitrary schema নয়; server-side type validation।
5. Database schema export, relations-এর import ও spread, repository methods, migration SQL এবং schema parity checks যোগ করা। Migration apply করা হবে না; শুধু generate/inspect করা হবে এবং explicit approval ছাড়া database-এ চালানো হবে না।

### Phase 2 — Business service এবং reliable order lifecycle

1. `packages/business`-এ `OrderService` তৈরি করা:
   - `startDraft` — current workspace/contact/conversation-এ active draft reuse করে;
   - `updateDraft` — field/item পরিবর্তন, server-side validation ও total recalculation;
   - `getDraft`, `list`, `getById`;
   - `showSummary`/summary builder;
   - `requestConfirmation` এবং explicit confirmation token/version;
   - `confirm` — transaction-এর ভিতরে required field, price, expiry, idempotency ও confirmation যাচাই করে;
   - `cancel`, `expire`, `changeStatus`;
   - existing order lookup, new-order separation এবং customer order history;
   - status history/audit event এবং cache invalidation/event emission।
2. Draft duplicate prevention:
   - workspace + conversation/contact-এ একটিমাত্র non-terminal AI draft;
   - incomplete draft configurable expiry সহ;
   - expired draft পুনরায় চালু করার আগে customer choice;
   - confirmed draft পুনরায় confirm করলে existing order return, duplicate create নয়।
3. Intent boundary স্পষ্ট করা:
   - নতুন order, existing order status, product details, delivery question, modify/cancel এবং general support আলাদা action;
   - product detail বা delivery question কখনো নতুন order তৈরি করবে না;
   - customer নতুন item চাইলে নতুন draft; পুরনো order status চাইলে existing order read path।
4. Inventory/price policy:
   - final price server-side catalog থেকে calculate;
   - order item-এ immutable snapshot;
   - tracked inventory থাকলে atomic reservation/decrement policy;
   - out-of-stock/variant mismatch হলে confirm reject;
   - payment/cash-on-delivery state order status থেকে আলাদা রাখা।
5. Contact/customer history এবং courier-risk result-এর জন্য local aggregate/cache রাখা হবে; external provider unavailable হলে order automatic reject নয়, review state হবে।

### Phase 3 — Order APIs এবং intake surfaces

1. Authorized builder API/actions:
   - list/detail/filter/search/pagination;
   - draft update/confirm/cancel;
   - status transition;
   - custom field definitions CRUD;
   - shipment booking/status actions;
   - permission scope ecommerce/order management।
2. Public/workspace-token APIs:
   - landing page/site order create বা draft intake;
   - external order import/upsert;
   - order status lookup only with scoped token/reference;
   - webhook signature/secret verification এবং workspace resolution।
3. Duplicate-safe external import:
   - source + externalOrderId unique upsert;
   - source-specific status mapping;
   - raw payload সংরক্ষণ সীমিত ও redacted;
   - replay-safe event processing, event timestamp/version এবং audit record।
4. Website/landing-page integration contract:
   - customer/contact, items, quantity, address, total, currency, external ID;
   - imported order `confirmed` কিনা source policy দিয়ে নির্ধারণ;
   - untrusted totals হলে server-side product/price revalidation;
   - invalid/missing data হলে draft বা review state।

### Phase 4 — AI agent order tools

1. `packages/ai/src/constants/index.ts` ও `packages/ai/src/server/tools/system-functions.ts`-এ typed tool IDs, Zod input schemas, catalog labels এবং executor contracts যোগ করা:
   - `start_order_draft`;
   - `update_order_draft`;
   - `get_current_order_draft`;
   - `get_my_orders`/`get_order_details`;
   - `calculate_order_total`;
   - `show_order_summary`;
   - `request_order_confirmation`;
   - `confirm_order`;
   - `cancel_order_draft`;
   - `handoff_order_to_human`;
   - transaction type অনুযায়ী appointment/quote tools।
2. Worker executor যোগ করা:
   - workspace/contact/conversation context ব্যবহার;
   - service-only mutation, direct DB নয়;
   - safe response fields;
   - explicit confirmation না থাকলে `confirm_order` reject;
   - high-value diamond quote হলে direct order নয়, quote/human review;
   - appointment tool existing appointment service ব্যবহার করবে।
3. Tool wiring সব AI execution path-এ নিশ্চিত করা:
   - automated-response replies path;
   - shared AI agent runner-এর configured context/executor path;
   - builder tool selector/provider state;
   - tool statistics ও error handling।
4. Agent policy/prompt contract:
   - required fields এক বা দুইটি করে collect;
   - ambiguous “ঠিক আছে” confirmation নয়;
   - password/card credential কখনো চাওয়া নয়;
   - price, stock, slot, certificate বা courier result invent নয়;
   - current draft বনাম existing order lookup আলাদা;
   - customer confirmation summary-তে item, quantity, price, delivery এবং key fields দেখানো।

### Phase 5 — Full Orders builder page

1. Route/page/layout:
   - `apps/builder/src/app/space/[workspaceId]/(e-commerce)/orders/page.tsx`;
   - প্রয়োজন হলে `[id]/page.tsx` detail এবং route-specific permission layout;
   - existing ecommerce tabs-এর Orders link active করা;
   - ecommerce/order permission guard যোগ করা।
2. Main page tabs:
   - Draft Orders;
   - Awaiting Confirmation;
   - Active Orders;
   - Completed;
   - Cancelled/Returned;
   - Quotes;
   - Appointments;
   - optional All view।
3. Table capability, Products table pattern অনুসরণ করে:
   - server pagination/search/filter/sort;
   - source, order type, status, customer, phone, total, courier, created date;
   - row selection এবং bulk status/courier actions;
   - loading/empty/error states;
   - duplicate/risk/review indicators;
   - safe phone display এবং workspace scoping।
4. Detail page/drawer:
   - customer information এবং conversation link;
   - item/variant/quantity/price snapshot;
   - custom fields;
   - status timeline/audit events;
   - AI activity/tool calls summary;
   - source/external order details;
   - shipment/consignment/courier status;
   - risk signal ও manual review action;
   - edit draft, confirm, cancel, refund/return বা handoff—permission অনুযায়ী।
5. Custom field builder/settings:
   - order type selector;
   - field create/edit/delete/reorder;
   - required/AI-visible/customer-editable toggles;
   - field type/options validation;
   - preview এবং translation keys।
6. UI mutation invalidation:
   - order list/detail/status/draft/custom-field/shipment query tags;
   - mutation সফল হলে invalidate করে তারপর navigation;
   - `router.refresh()`-এর উপর একা নির্ভর না করা।

### Phase 6 — Courier integrations (Bangladesh)

1. `packages/business`-এ normalized courier provider contract:
   - `createShipment`, `bulkCreateShipments`, `calculateFee`, `track`, `cancel`, `checkCoverage`, `getDeliveryHistory` যেখানে provider অনুমোদিত;
   - provider-specific adapters integration package-এ;
   - credentials encrypted workspace integration settings-এ।
2. Phase order:
   - Pathao;
   - Steadfast;
   - RedX;
   - পরে provider capability যাচাই করে Paperfly/eCourier/CarryBee/অন্য provider।
3. Courier shipment model:
   - orderId/provider/externalConsignmentId;
   - COD amount, delivery fee, pickup/destination snapshot;
   - external/internal status;
   - last sync এবং status history;
   - `provider + externalConsignmentId` idempotency।
4. Webhook/polling:
   - provider signature/token verification;
   - webhook route → queue → service;
   - status mapping, out-of-order event protection, retry ও replay;
   - webhook miss হলে scheduled polling fallback;
   - delivery/return/COD reconciliation।
5. Orders page থেকে one-click ও bulk booking:
   - required address/phone/weight/COD validation;
   - courier নির্বাচন;
   - create shipment response/consignment ID;
   - label/tracking link; failure হলে retry-safe state।

### Phase 7 — Fake-order/courier-risk protection

1. Provider contract শুধু official/authorized API বা approved aggregator-এর জন্য; scraping নয়। Provider-এর terms, privacy, retention এবং customer notice যাচাই করে integration enable হবে।
2. Phone normalization এবং lookup cache:
   - Bangladesh phone format normalization;
   - provider response timestamp/source;
   - no-history, unavailable এবং real result আলাদা state;
   - sensitive raw response অপ্রয়োজনে সংরক্ষণ নয়।
3. Risk result:
   - delivered, returned, cancelled/refused, total;
   - success/return ratio;
   - local store history + external signal;
   - current order value, repeated address/phone এবং verification signal;
   - `safe`, `review_required`, `high_risk`, `no_history`, `provider_unavailable`।
4. Workspace policy:
   - COD allow;
   - delivery charge advance;
   - full advance/manual call;
   - admin approval;
   - automatic reject নয় যখন provider unavailable বা no history।
5. AI behavior:
   - customer-কে “fake” label না বলা;
   - review/verification wording ব্যবহার;
   - risk result-এর ভিত্তিতে order draft রাখা বা human handoff।

### Phase 8 — Appointment, diamond এবং future transaction types

1. Appointment:
   - existing appointment calendar/service/slot booking পুনর্ব্যবহার;
   - order/booking view-এ linked record;
   - concurrency lock, timezone, cancel/reschedule এবং reminder অপরিবর্তিত service path-এ।
2. আসল diamond:
   - product attributes (carat, shape, color, clarity, certificate, budget) custom fields/catalog filter;
   - quote request status, specialist review, customer follow-up;
   - certificate/quality invent না করা;
   - quote approve না হওয়া পর্যন্ত confirmed shipment/order নয়।
3. Digital/follower service ভবিষ্যতে configurable service-order type হিসেবে যোগ করা যাবে; বর্তমান scope-এ core contract এমনভাবে রাখা হবে যাতে আলাদা fulfillment status ও package/target fields যোগ করা যায়।

### Phase 9 — Translations, permissions, observability এবং tests

1. `apps/builder/messages/en.json`-এ orders, order status, filters, actions, field builder, courier, risk এবং error keys; supported locale files sync।
2. `apps/builder/src/lib/auth/permission-routes.ts`, sidebar বা ecommerce permission registration প্রয়োজনমতো update; support access/tenant scoping বজায় রাখা।
3. Structured logger ব্যবহার; `err` key-তে errors; order/courier webhook-এ sensitive customer data log না করা।
4. Tests:
   - database schema/relation/repository;
   - service lifecycle, draft reuse, explicit confirmation, idempotency, expiry, status transitions, price snapshot, tenant isolation;
   - custom-field validation;
   - AI tool schemas/executors and runner wiring;
   - public import API signature/scope/duplicate upsert;
   - Orders page table/filter/action and translation key validation;
   - courier adapter mapping/webhook replay/out-of-order event;
   - risk classification and provider unavailable behavior;
   - appointment/quote-specific rules।
5. Verification gate:
   - targeted package tests;
   - builder/worker/database type checks;
   - lint এবং database drift check;
   - full test suite/build as blast radius অনুযায়ী।

## Assumptions & Decisions

- Planটি current main folder `d:\Downloads\chatbotx-salesmanchatbot-main\chatbotx-salesmanchatbot-main`-এর জন্য; খোলা `push` folder-এর Messenger file scope-এর বাইরে।
- “Diamond” বলতে আসল diamond business ধরা হয়েছে; game diamond/top-up নয়।
- প্রথম delivery scope হলো e-commerce Orders page + AI draft/confirm lifecycle + website/landing-page import contract + courier/risk integration-ready foundation। Appointment এবং diamond একই generic transaction model ব্যবহার করবে, কিন্তু তাদের আলাদা validation/service থাকবে।
- Active Order মানে final customer-confirmed বা fulfillment-started order; Draft Order মানে incomplete/awaiting-confirmation order। এগুলো আলাদা table নয়, status-derived views।
- AI final order তৈরি করবে না যতক্ষণ server-side explicit confirmation এবং required-field validation সফল না হয়।
- External website/social orders duplicate-safe upsert হবে; source ও external ID ছাড়া trusted import গ্রহণ করা হবে না।
- Courier APIs কেবল official/authorized credential বা approved provider দিয়ে ব্যবহার হবে; scraping বা undocumented endpoint production dependency হবে না।
- Courier delivery-history/fraud data একটি risk signal, customer-এর final identity/fraud verdict নয়।
- Database migration তৈরি ও inspect করা যাবে, কিন্তু explicit user approval ছাড়া apply করা যাবে না।
- No implementation will start until this plan is approved.

## Verification Steps

1. Database schema/relation export ও generated migration inspect; `db:check-drift` চালিয়ে schema drift নেই নিশ্চিত করা।
2. Business service tests দিয়ে draft→awaiting_confirmation→confirmed lifecycle, repeated confirmation এবং concurrent update যাচাই।
3. AI tool contract tests দিয়ে required field, summary, explicit confirmation এবং existing-order intent যাচাই।
4. Builder Orders page-এর server pagination/filter/status tabs, detail actions, translations এবং permission guard যাচাই।
5. External import tests দিয়ে webhook signature, source/external ID idempotency এবং status mapping যাচাই।
6. Courier adapter tests দিয়ে Pathao/Steadfast/RedX provider contract, retry, webhook replay ও polling fallback যাচাই।
7. Risk tests দিয়ে delivered/returned/no-history/provider-unavailable policy যাচাই।
8. Targeted checks: database types/tests, business tests, worker tests, builder types/tests; শেষে `pnpm lint`, relevant coverage/tests এবং build।
9. Production integration-এর আগে প্রতিটি courier ও fraud provider-এর credential, endpoint, terms, privacy এবং webhook behavior বাস্তবে merchant sandbox/approval দিয়ে confirm করা।
