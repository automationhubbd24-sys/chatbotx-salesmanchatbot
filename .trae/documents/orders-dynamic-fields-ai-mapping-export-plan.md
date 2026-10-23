# Orders Dynamic Fields, AI Mapping ও Export Plan

## Summary

Settings-এ seller যে order custom field তৈরি করবে, সেটিই একক source of truth হিসেবে ব্যবহার হবে:

```text
Settings field definition
→ AI field catalog
→ AI key/value update
→ definitionId resolve ও typed validation
→ OrderCustomFieldValue upsert
→ Orders table dynamic column
→ CSV / Google Sheets export column
```

Screenshot-এর মতো Orders page-এ fixed order columns-এর সঙ্গে seller-defined fields automatically দেখাবে। Customer যে value দেবে, সেটি তার নির্দিষ্ট field key-এর value হিসেবে সংরক্ষিত হবে এবং table, detail, CSV ও Google Sheet-এ একইভাবে দেখা যাবে।

এই কাজটি existing workspace/order-type scoping, `orderService → orderRepository → database` boundary এবং existing Google Sheets integration ব্যবহার করে করা হবে।

## Current State Analysis

### যা ইতিমধ্যে আছে

- `OrderCustomFieldDefinition`-এ workspace, order type, key, label, type, required, options, `aiVisible`, `customerEditable` এবং `displayOrder` আছে।
- `OrderCustomFieldValue`-এ `orderId + definitionId` unique value storage আছে।
- `packages/business/src/order/service.ts` definitions ও values join করে order list-এ `customFields` ফেরত দেয়।
- `apps/builder/src/features/orders/orders-table.tsx` definition অনুযায়ী dynamic columns বানায় এবং `displayOrder` অনুযায়ী সাজায়।
- Settings-এর custom field manager seller-এর field configuration তৈরি/সম্পাদনা করে।
- Google Sheets provider-এ `listSheetHeaders`, `insertRow`, `updateRow` এবং worksheet-scoped integration context আছে।
- Contact export feature-এ CSV serialization, filtering এবং export test-এর existing pattern আছে।

### যে সমস্যাগুলো সমাধান করতে হবে

1. AI এখন seller-defined field-এর key, label, type, options বা required status পায় না।
2. AI-এর arbitrary field data `OrderCustomFieldValue`-তে definition ID resolve করে save হয় না।
3. `updateDraft()` canonical snapshot fields handle করে, কিন্তু generalized custom field write path নেই।
4. Orders table dynamic columns থাকলেও values নির্ভরযোগ্যভাবে AI custom-field write path থেকে আসছে না।
5. Order CSV export নেই।
6. Order Google Sheets export নেই।
7. Existing definitions সব order type-এর জন্য একসঙ্গে table-এ আসতে পারে; row-এর order type অনুযায়ী applicable columns স্পষ্টভাবে handle করতে হবে।
8. Customer-provided untrusted value-এর সঙ্গে seller instruction বা AI mapping মিশিয়ে prompt injection তৈরি করা যাবে না।

## Proposed Changes

### 1. Custom-field definition validation ও catalog

**Files:**

- `packages/business/src/order/service.ts`
- `packages/database/src/repositories/order/repository.ts`
- `apps/builder/src/features/order-custom-fields/schema/action.ts`
- `apps/builder/src/features/order-custom-fields/components/order-custom-fields-manager.tsx`

**পরিবর্তন:**

- Definition create/update-এর সময় key trim, label trim এবং workspace/order type uniqueness বজায় রাখা।
- `select` ও `multiselect` হলে non-empty options বাধ্যতামূলক করা।
- অন্য type-এর জন্য irrelevant options normalize করে `null`/empty করা।
- `displayOrder` deterministic রাখা। একই order type-এর definitions-এর জন্য display order অনুযায়ী stable sorting করা।
- Seller UI-তে field key-কে AI mapping identifier হিসেবে স্পষ্টভাবে দেখানো হবে। Label পরিবর্তন হলেও key stable রাখার নির্দেশনা থাকবে।
- Field manager-এ preview দেখানো হবে যে AI কোন key-এ value লিখবে: key, label, type, required এবং allowed options।

**সিদ্ধান্ত:**

- Storage-এর authoritative reference থাকবে `definitionId`।
- AI, CSV এবং Google Sheets-এর logical contract হবে `key`; display header হবে `label`।
- Existing definition key rename করা হলে নতুন incoming values নতুন key-এ যাবে; পুরোনো saved values পুরোনো definition row-তে থাকবে এবং historical order-এ definition label/type অনুযায়ী render হবে।

### 2. Typed key-to-definition custom-field write service

**Files:**

- `packages/business/src/order/service.ts`
- `packages/database/src/repositories/order/repository.ts`
- `apps/worker/src/integration/handlers/automated-response/system-tools/orders.ts`
- `packages/business/__tests__/order-service.test.ts`

**পরিবর্তন:**

`orderService`-এ একটি dedicated business method যোগ হবে, যেমন:

```ts
updateDraftCustomFields({
  workspaceId,
  orderId,
  values: Record<string, unknown>,
  expectedVersion?,
  tx?,
})
```

Method-এর flow:

1. `workspaceId + orderId` দিয়ে active order load করবে।
2. Order-এর `type` অনুযায়ী definitions load করবে।
3. Incoming key দিয়ে definition resolve করবে।
4. Unknown key reject করবে; silently অন্য workspace/order type-এর field গ্রহণ করবে না।
5. AI write path-এ শুধু `aiVisible === true` field গ্রহণ করবে।
6. `text`, `phone`, `email`, `number`, `currency`, `date`, `datetime`, `select`, `multiselect`, `address`, `product`, `variant`, `boolean`, `textarea` অনুযায়ী type validation করবে।
7. `select`/`multiselect` value allowed options-এর মধ্যে আছে কি না যাচাই করবে।
8. Normalized value `orderRepository.saveCustomFieldValues()`-এ `definitionId` দিয়ে upsert করবে।
9. Required validation-এর জন্য saved values এবং current snapshot দুটোই সঠিকভাবে বিবেচনা করবে।
10. `expectedVersion` থাকলে একই optimistic-concurrency rule বজায় রাখবে।

`updateDraft()`-এর order-level data ও custom field data একই business transaction-এর মধ্যে update হবে, যাতে customer তথ্যের কিছু অংশ save হয়ে অন্য অংশ হারিয়ে না যায়।

Worker-এর `update_order_draft` executor `data.customFields` বা equivalent normalized map আলাদা করে এই service method-এ পাঠাবে; worker সরাসরি database access করবে না।

### 3. AI-কে seller field key/label/type instruction দেওয়া

**Files:**

- `packages/ai/src/server/tools/system-functions.ts`
- `packages/ai/src/constants/index.ts`
- `apps/worker/src/integration/handlers/automated-response/system-tools/orders.ts`
- প্রয়োজন হলে `packages/business/src/order/service.ts`
- সংশ্লিষ্ট AI/tool tests

**পরিবর্তন:**

AI order update input-এ arbitrary passthrough-এর পরিবর্তে explicit custom field map থাকবে:

```ts
customFields: z.record(z.string(), z.unknown()).optional()
```

AI tool execution-এর আগে current workspace/order type-এর AI-visible field catalog system/tool context-এ দেওয়া হবে। Catalog-এ থাকবে:

- field key
- seller label
- field type
- required status
- select/multiselect options
- concise instruction: কোন customer information এই field-এ রাখতে হবে

Instruction example:

```text
Field key: delivery_address
Label: Delivery Address
Type: address
Required: yes
Instruction: Save the customer's complete delivery address in customFields.delivery_address.
```

AI field catalog customer-এর message থেকে নেওয়া content হিসেবে treat করা হবে না; এটি trusted seller configuration হিসেবে tool/system instruction অংশে যাবে। Customer message কখনও field instruction override করতে পারবে না।

**Tool consolidation:**

আগের customer-facing সাতটি order tool-কে একটি professional `manage_order`/`order` tool-এর action model-এর অধীনে আনা হবে:

- `start`
- `update`
- `get_current`
- `request_confirmation`
- `confirm`
- `cancel`
- `get_details`

Existing configured tool IDs থাকলে migration/compatibility mapping রাখা হবে, কিন্তু নতুন agent configuration-এ একটি order tool expose হবে। Internal executors business service-এর একই methods ব্যবহার করবে।

### 4. Required এবং customer-editable policy

**Files:**

- `packages/business/src/order/service.ts`
- customer-facing order update handler/form যেখানে আছে
- `packages/business/__tests__/order-service.test.ts`

**পরিবর্তন:**

- Confirmation-এর আগে required seller fields definition key অনুযায়ী validate হবে।
- Saved `OrderCustomFieldValue` থাকলে সেটি authoritative হবে; canonical snapshot fallback কেবল legacy/imported order compatibility-এর জন্য থাকবে।
- Customer-facing update path থাকলে `customerEditable === true` ছাড়া field update reject হবে।
- AI path-এ `aiVisible === false` field update reject হবে।
- Seller/admin/internal import path আলাদা হলে সেটি `aiVisible` দিয়ে সীমাবদ্ধ হবে না, তবে workspace/order type definition validation সবসময় চলবে।

### 5. Screenshot অনুযায়ী dynamic Orders table

**Files:**

- `apps/builder/src/features/orders/orders-table.tsx`
- `apps/builder/src/app/space/[workspaceId]/(e-commerce)/orders/page.tsx`
- `apps/builder/src/features/orders/custom-field-display.tsx`
- `apps/builder/src/features/orders/order-detail.tsx`

**পরিবর্তন:**

- Fixed columns screenshot-এর structure অনুযায়ী রাখা/সমন্বয় করা হবে: date, product, quantity, price/total, location, customer, phone, status, sender ID, courier/actions—যেগুলোর data বর্তমান order/contact model-এ নির্ভরযোগ্যভাবে পাওয়া যায়। যেসব action ইতিমধ্যে অন্য component-এ আছে, সেগুলোর ownership না ভেঙে table integration করা হবে।
- Seller-defined fields fixed columns-এর পরে dynamic columns হিসেবে দেখাবে। Header-এ `label`, export/API contract-এ `key` ব্যবহার হবে।
- শুধু current page-এর values দেখে column তৈরি না করে workspace definitions থেকে column তৈরি হবে, ফলে সব value empty হলেও column থাকবে।
- Definitions order type অনুযায়ী applicable হবে; কোনো row-এর জন্য প্রযোজ্য নয় এমন field empty দেখাবে।
- Values `definitionId` দিয়ে resolve হবে এবং formatted display shared formatter ব্যবহার করবে।
- `address`, `product`, `variant`, `multiselect`, boolean এবং empty value-এর structured display যোগ হবে।
- Column width/ellipsis screenshot-এর মতো রাখা হবে; full value title/accessible text-এ থাকবে।
- Existing Today, Yesterday এবং custom date filter search/status-এর সঙ্গে একই URL query state বজায় রাখবে।
- Mutation বা export-এর পরে stale query/page state থাকলে existing invalidation/navigation convention অনুসরণ করা হবে।

### 6. CSV export

**Files:**

- নতুন order export business/service module, সম্ভব হলে `packages/business/src/order/`-এর মধ্যে existing order ownership অনুযায়ী
- `packages/database/src/repositories/order/repository.ts`
- নতুন builder order export action/API file under `apps/builder/src/features/orders/`
- `apps/builder/src/features/orders/orders-table.tsx`
- CSV utility/test files
- order/business export tests

**পরিবর্তন:**

Orders page-এর CSV button current URL-এর search, status/filter এবং date range ব্যবহার করে **current page নয়, সব matching orders** export করবে।

CSV column order:

1. fixed order columns
2. applicable custom fields sorted by `orderType`, then `displayOrder`, then stable definition ID/key

Dynamic custom-field header হবে `label`; প্রয়োজনে collision এড়াতে `label (key)` format ব্যবহার হবে। Value serialization:

- scalar → plain text
- multiselect → deterministic delimiter-joined text
- address/product/variant/object → stable readable JSON/text
- date/datetime → ISO or workspace-consistent export format
- empty → empty cell

CSV serializer existing safe escaping pattern অনুসরণ করবে এবং formula injection প্রতিরোধ করবে (`=`, `+`, `-`, `@` দিয়ে শুরু হওয়া untrusted text safe করা)। Export endpoint/action workspace authorization এবং query scope enforce করবে।

### 7. Google Sheets export

**Files:**

- order export service/module under `packages/business/src/order/` বা dedicated export business module
- `apps/builder/src/features/orders/` action/API/UI components
- `apps/builder/src/features/spreadsheets/lib/google-sheets.ts`
- `integrations/google-sheets/src/integration.ts`
- existing patterns from `apps/worker/src/integration/handlers/spreadsheet-handler.ts`
- Google Sheets/order export tests

**পরিবর্তন:**

Orders page-এর Google Sheet button:

1. workspace-এর connected Google Sheets integration resolve করবে।
2. seller-এর selected spreadsheet ও worksheet নিতে UI dialog দেখাবে।
3. existing worksheet/header helper ব্যবহার করবে।
4. current filter/search/date scope-র সব matching orders load করবে।
5. fixed + dynamic field header list তৈরি করবে।
6. worksheet empty হলে headers লিখবে; existing matching headers থাকলে তাদের order preserve করে missing headers যোগ করবে।
7. order rows insert করবে।
8. duplicate এড়াতে sheet-এর reserved stable `order_id` column ব্যবহার করে matching row update করবে; একই order পুনরায় export করলে duplicate row তৈরি হবে না।
9. rows-এ values `key`-based mapping থেকে নেওয়া হবে, header display label হলেও mapping stable key metadata দিয়ে হবে।

Google Sheets provider call existing `buildContext`, workspace-scoped integration lookup, `listSheetHeaders`, `insertRow`, `updateRow` actions ব্যবহার করবে। Builder action/business service data preparation করবে; provider-specific raw DB access বা unscoped worksheet access হবে না। User-visible success/error state এবং translated messages যোগ হবে।

### 8. Security ও tenancy

**Files:**

- সংশ্লিষ্ট builder actions/API
- `packages/business/src/order/service.ts`
- Google Sheets export service
- AI executor

**নীতি:**

- সব order, definition, value এবং export query `workspaceId` দিয়ে scoped হবে।
- Incoming definition ID, key বা order ID client/AI থেকে blindly trust করা যাবে না।
- Order ID থেকে workspace পুনরায় যাচাই না করে custom values বা sheet rows লেখা যাবে না।
- AI-visible/customer-editable policy service layer-এ enforce হবে, শুধু UI বা prompt-এ নয়।
- Customer-provided text seller field instruction বা export formula হিসেবে execute হবে না।
- Google Sheet এবং worksheet workspace ownership verify করে তবেই provider call হবে।
- Server-side failures structured logger-এ `{ err }` key দিয়ে log হবে।

## Assumptions & Decisions

1. Settings-এর custom field definitions-ই dynamic Orders UI, AI mapping, CSV এবং Google Sheets-এর single source of truth।
2. AI input contract হবে `customFields: Record<string, unknown>`; service key-to-definition resolve করবে।
3. Storage authoritative থাকবে `definitionId` ভিত্তিক; external logical contract হবে field `key`।
4. CSV এবং Google Sheets export current page নয়, active search/status/date filters-এর সব matching order export করবে।
5. Google Sheets export idempotent হবে এবং stable `order_id` দিয়ে existing row update করবে।
6. Sheet header display-এর জন্য label, machine mapping-এর জন্য key ব্যবহৃত হবে।
7. Field definition delete হলে cascade behavior schema অনুযায়ী থাকবে; historical order export-এ বর্তমানে বিদ্যমান definitions-ই columns হিসেবে আসবে। এই কারণে deletion policy implementation-এর সময় historical snapshot প্রয়োজন হলে আলাদা সিদ্ধান্ত ছাড়া নতুন schema যোগ করা হবে না।
8. Order type-specific fields অন্য order type-এর row-তে blank থাকবে বা type-specific view-তে filter হবে; একই workspace-এর সব definitions একত্রে অন্ধভাবে customer data হিসেবে দেখানো হবে না।
9. Existing order lifecycle, confirmation token/version এবং external-order idempotency পরিবর্তন করা হবে না; custom field update সেগুলোর সঙ্গে transaction/concurrency নিয়ম মেনে যুক্ত হবে।
10. Gemini proxy 404 এবং Messenger avatar warning এই plan-এর scope-এর বাইরে; এগুলো আলাদা incident হিসেবে পরে fix করা হবে।

## Verification Steps

### Unit/business tests

- key থেকে definition resolve এবং unknown key rejection
- workspace/order type isolation
- `aiVisible` এবং `customerEditable` enforcement
- সব custom field type normalization/validation
- select/multiselect option validation
- custom value upsert এবং repeated update
- required-field confirmation success/failure
- optimistic version conflict
- renamed field এবং legacy snapshot fallback behavior

### AI/worker tests

- AI catalog-এ key, label, type, required এবং options আসে
- AI `customFields` update সঠিক definition ID-তে save হয়
- hidden AI field reject হয়
- consolidated order tool-এর action routing ঠিক থাকে
- old tool configuration compatibility mapping কাজ করে

### Builder/UI tests

- definitions থেকে dynamic columns তৈরি হয়, current page values না থাকলেও
- display order ও order type filtering ঠিক থাকে
- formatted address/product/variant/multiselect output
- search/status/date filter সহ export trigger হয়
- translated success/error states

### Export tests

- CSV fixed ও dynamic headers stable থাকে
- CSV escaping এবং formula injection protection
- all matching rows export হয়, শুধু current page নয়
- Google Sheet header creation/update
- first export insert এবং repeated export update
- missing/duplicate sheet header handling
- Google integration/worksheet workspace mismatch reject

### Repository verification

পরিবর্তন শেষে, touched packages-এর জন্য project workflow অনুযায়ী:

```powershell
corepack pnpm lint
corepack pnpm test
$env:NODE_OPTIONS='--max-old-space-size=8192'; corepack pnpm --filter builder exec tsc --noEmit
```

Database schema পরিবর্তন প্রয়োজন হলে migration SQL generate ও inspect করা হবে; explicit user approval ছাড়া migration apply করা হবে না।
