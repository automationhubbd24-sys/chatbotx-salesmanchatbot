# Orders Dynamic Fields ও Single Date Filter Plan

## Summary

Orders page-এ seller যে custom order field তৈরি করবে, order আসার পর সেই field definition ও saved value automatically load হয়ে tracking-style table-এ দেখানো হবে। Field hardcode করা হবে না; seller-এর `displayOrder` অনুযায়ী dynamic column তৈরি হবে। একই সঙ্গে Today, Yesterday এবং Custom date range আলাদা আলাদা control না রেখে একটি filter button/popover-এর মধ্যে রাখা হবে। Existing URL contract (`date`, `from`, `to`) এবং backend date semantics অপরিবর্তিত থাকবে।

## Current State Analysis

- [orders-table.tsx](file:///d:/Downloads/chatbotx-salesmanchatbot-main/chatbotx-salesmanchatbot-main/apps/builder/src/features/orders/orders-table.tsx) এখন `OrderModel[]` নেয় এবং Order/Status/Source/Total/Created hardcoded columns দেখায়। Seller-defined custom field list row-তে নেই। Date controls Today, Yesterday, From, To আলাদা button/input হিসেবে আছে।
- [orders/page.tsx](file:///d:/Downloads/chatbotx-salesmanchatbot-main/chatbotx-salesmanchatbot-main/apps/builder/src/app/space/[workspaceId]/(e-commerce)/orders/page.tsx) URL query থেকে `date`, `from`, `to` parse করে `createdFrom`/`createdTo` বানিয়ে service-এ পাঠায়। Inclusive `to` date-এর জন্য exclusive next-day boundary ব্যবহার করে। এই server-side flow রাখা হবে।
- [service.ts](file:///d:/Downloads/chatbotx-salesmanchatbot-main/chatbotx-salesmanchatbot-main/packages/business/src/order/service.ts) `list()` বর্তমানে repository result pass-through করে; custom field display view model তৈরি করে না। Custom field definitions order type অনুযায়ী scoped।
- Order repository-এর existing list query base order rows ফেরত দেয়, আর detail query custom field values-এর সঙ্গে definition relation load করে। List-এর জন্য N+1 query এড়াতে paginated orders-এর IDs দিয়ে batch query দরকার হবে।
- [order-detail.tsx](file:///d:/Downloads/chatbotx-salesmanchatbot-main/chatbotx-salesmanchatbot-main/apps/builder/src/features/orders/order-detail.tsx) custom field value generic `String()`/`JSON.stringify()` করে দেখায়; definition type/options/display order ব্যবহার করে না। একই display formatting detail view-তেও প্রয়োগ করা হবে যাতে list ও detail consistent হয়।
- Shared [popover.tsx](file:///d:/Downloads/chatbotx-salesmanchatbot-main/chatbotx-salesmanchatbot-main/packages/ui/src/components/ui/popover.tsx) এবং [calendar.tsx](file:///d:/Downloads/chatbotx-salesmanchatbot-main/chatbotx-salesmanchatbot-main/packages/ui/src/components/ui/calendar.tsx) range calendar support করে। Existing contact filter-এর Popover + `react-day-picker` `DateRange` pattern অনুসরণ করা হবে।
- সব user-facing label translation-এর মাধ্যমে দিতে হবে; নতুন labels `orders` namespace-এ যোগ করতে হবে।

## Proposed Changes

### 1. Enrich order list data with custom fields

**Files:**

- `packages/database/src/repositories/order/repository.ts`
- `packages/business/src/order/service.ts`

**What/How:**

1. Repository-তে paginated order list-এর জন্য একটি batch method যোগ/ব্যবহার করা হবে, যা:
   - current workspace-এর order type অনুযায়ী definitions load করবে;
   - returned order IDs-এর জন্য custom field values একবারে load করবে;
   - values-এর সঙ্গে matching definitions map করবে;
   - `displayOrder` এবং definition creation order অনুসারে stable ordering রাখবে।
2. Query অবশ্যই workspace-scoped হবে এবং current page-এর order IDs ছাড়া অতিরিক্ত per-row query করবে না।
3. Service একটি normalized list view model ফেরত দেবে, যেমন:
   - `customFields: Array<{ definitionId, key, label, type, options, displayOrder, value }>`
4. Existing raw order properties বজায় থাকবে, যাতে current status/source/total/pagination code ভাঙে না।
5. Definitions order type scoped হওয়ায় প্রতিটি order তার নিজের `order.type`-এর definitions পাবে; অন্য order type-এর field row-তে দেখানো হবে না।
6. Page-level table columns তৈরির জন্য service response-এ definitions/value metadata usable থাকবে। Empty value থাকা definition-ও column discovery-এর জন্য রাখা হবে, কিন্তু cell-এ translated empty marker দেখানো হবে।

### 2. Add shared custom-field display formatting

**Files:**

- `apps/builder/src/features/orders/`-এর existing order UI module অথবা একটি small shared component/helper under `apps/builder/src/features/orders/components/`
- `apps/builder/src/features/orders/orders-table.tsx`
- `apps/builder/src/features/orders/order-detail.tsx`

**What/How:**

1. Field type অনুযায়ী একই formatter ব্যবহার করা হবে:
   - text/textarea/phone/email/number: readable text;
   - currency: order currency সহ numeric format;
   - date/datetime: locale date/time format;
   - select: definition options থেকে selected label;
   - multiselect: একাধিক selected label compact chips/commas;
   - boolean: translated Yes/No;
   - address/product/variant/object: safe readable JSON বা structured text, raw `[object Object]` নয়।
2. Null, empty string, empty array এবং missing value-এর জন্য consistent translated em dash/empty marker থাকবে।
3. `displayOrder` অনুযায়ী fields sort হবে।
4. Detail page-এর custom field card-এর current generic rendering replace করে এই normalized metadata/formatter ব্যবহার করা হবে। Confirmation token/version বা অন্য internal metadata customer-facing UI-তে দেখানো হবে না।
5. একবারে reusable abstraction বানানো হবে; order-specific one-off duplicate formatting এড়ানো হবে।

### 3. Make Orders list tracking-style and dynamically render fields

**Files:**

- `apps/builder/src/features/orders/orders-table.tsx`
- প্রয়োজনে `apps/builder/src/features/orders/components/`-এর নতুন ছোট component
- `apps/builder/messages/*.json`

**What/How:**

1. Existing fixed columns-এর সঙ্গে seller-defined fields dynamically append/insert করা হবে। Default order tracking columns থাকবে: order/date, product/order summary, quantity/total, status, source/created; custom fields seller-এর `displayOrder` অনুযায়ী readable position-এ থাকবে।
2. একই custom field multiple orders/order types-এ না থাকলে column header definition label হবে, missing cells empty marker দেখাবে।
3. Long values (address, product details, textarea) table layout নষ্ট না করে truncation + title/accessible text অথবা compact stacked content-এ দেখানো হবে।
4. Row click detail navigation বজায় থাকবে; dynamic cell click যেন row behavior নষ্ট না করে।
5. Screenshot-এর মতো compact, horizontally scrollable tracking table রাখা হবে; mobile-এ overflow-x-auto বজায় থাকবে।
6. Seller field না থাকলে existing table cleanভাবে render হবে; আলাদা empty custom-field section দেখানো হবে না।
7. User-facing custom-field labels/status/empty text সব translation key ব্যবহার করবে।

### 4. Replace separate date controls with one filter button/popover

**Files:**

- `apps/builder/src/features/orders/orders-table.tsx`
- `apps/builder/messages/*.json`

**What/How:**

1. Native From/To inputs এবং separate Today/Yesterday buttons সরিয়ে একটি `Popover` trigger button যোগ করা হবে; trigger-এ filter/calendar icon এবং active selection label থাকবে।
2. Popover-এর ভিতরে:
   - Today preset;
   - Yesterday preset;
   - Custom date range option;
   - `Calendar mode="range"`;
   - Clear action;
   - Apply action।
3. Popover খোলার সময় current URL state থেকে local draft state initialize হবে। User range complete না করা পর্যন্ত URL change হবে না।
4. Apply করলে existing URL contract বজায় থাকবে:
   - preset হলে `date=today|yesterday`, `from`/`to` remove;
   - custom range হলে `from`/`to=YYYY-MM-DD`, `date` remove;
   - page reset to `1`।
5. Clear করলে তিন date query remove হবে এবং page `1` হবে।
6. Existing `orders/page.tsx` server parser এবং repository `gte`/`lt` semantics change করা হবে না।
7. Popover close বা incomplete range apply করলে invalid/partial state URL-এ পাঠানো হবে না; existing backend partial range support থাকলেও UI-তে custom range হিসেবে Apply করার জন্য অন্তত start date প্রয়োজন হবে।
8. Active selection trigger label translated হবে: Today, Yesterday, অথবা selected date range; no filter হলে generic Filter label।

### 5. Translations

**Files:**

- `apps/builder/messages/en.json`
- সকল supported locale JSON files

**Keys:**

- `orders.dateFilters.title`
- `orders.dateFilters.custom`
- `orders.dateFilters.apply`
- `orders.dateFilters.active`
- `orders.dateFilters.filter`
- `orders.customFields.empty`
- `orders.customFields.yes`
- `orders.customFields.no`
- প্রয়োজনে field display/selection সংক্রান্ত ছোট labels

Existing `today`, `yesterday`, `from`, `to`, `clear` keys যতদূর অন্য UI-তে ব্যবহৃত হয় সংরক্ষণ করা হবে; নতুন component-এ hardcoded string থাকবে না।

### 6. Verification and tests

**Files/commands:**

- Existing order business tests under `packages/business/__tests__/`
- New focused tests যেখানে project convention অনুযায়ী উপযুক্ত
- `pnpm lint`
- touched workspace typecheck/test commands

**Checks:**

1. Repository/service test: multiple orders-এর custom values এক batch load হয়ে normalized fields ঠিক order-এ আসে।
2. Formatter test: currency, date/datetime, select, multiselect, boolean, object/empty values।
3. Date filter behavior test: Today/Yesterday/custom range/clear correct URL changes করে এবং server parser-এর expected dates অক্ষুণ্ণ রাখে।
4. Typecheck করে verify করতে হবে যে `OrdersTable` enriched response shape এবং detail response shape compatible।
5. Lint/test শেষে manually verify করতে হবে:
   - seller field create করলে order list-এ নতুন column automatic দেখা যায়;
   - value না থাকলে clean empty marker;
   - field reorder করলে display order বদলায়;
   - এক filter button থেকে Today, Yesterday, Custom range, Clear কাজ করে;
   - existing search, status tabs, pagination, row navigation কাজ করে।

## Assumptions & Decisions

- User-provided screenshot-এর মূল expectation হিসেবে seller-defined fields table-এর dynamic columns হিসেবে দেখানো হবে; hardcoded product/customer columns add করে seller field বাদ দেওয়া হবে না।
- Custom field definitions workspace + order type scoped থাকবে; global field column নয়।
- Existing database schema পরিবর্তন দরকার নেই; existing definition/value tables ব্যবহার করা হবে।
- Existing `date/from/to` query contract এবং server timezone behavior এই কাজের scope-এ পরিবর্তন করা হবে না।
- Public Orders API contract এই UI task-এর অংশ নয়; internal builder order list-এর enriched view-তেই change সীমাবদ্ধ থাকবে, unless shared service typing-এর জন্য strictly necessary হয়।
- Dynamic columns page-এর loaded orders/available definitions-এর union থেকে তৈরি হবে; pagination জুড়ে সব সম্ভাব্য field column দেখানোর জন্য আলাদা global definition query দরকার হলে service থেকে workspace/order-type definitions load করে সেই union ব্যবহার করা হবে।
- Database migration বা `db:migrate` চালানো হবে না, কারণ schema change পরিকল্পিত নয়।

## Verification Steps

1. Code changes-এর পর touched packages-এর typecheck চালানো।
2. `pnpm lint` চালানো এবং translation/formatting errors ঠিক করা।
3. Relevant order business/repository tests চালানো।
4. Local Orders page-এ seller field তৈরি করে product/appointment/quote order দিয়ে dynamic rendering যাচাই করা।
5. Filter button দিয়ে Today, Yesterday, Custom range এবং Clear চালিয়ে URL ও returned rows যাচাই করা।
6. Existing search, tabs, pagination, detail navigation এবং detail custom-field formatting regression check করা।
