# Debug Session: Order Confirmation and Custom Fields

Status: [OPEN]

## Symptom

A Messenger customer provides product, quantity, name, phone, address, and confirms with `yes`, but the bot replies that it could not generate a complete answer. The Orders page shows a draft with custom-field columns but empty values.

## Hypotheses

1. `start_order_draft` does not persist collected custom-field values under the seller-defined field keys.
2. The AI tool schema and the seller-defined custom-field definitions use different keys or types.
3. Required-field validation reads a different source than the draft update path.
4. The confirmation message is not associated with the same active draft/conversation.
5. The Orders page query is not loading or joining saved custom-field values correctly.

## Evidence To Collect

- Worker logs for the affected Messenger conversation.
- Tool-call input/output for draft creation, draft update, confirmation request, and confirmation.
- Draft id, conversation id, field keys, and saved values at each step.
- Final order query result and custom-field rows for the affected order.

## Reproduction

1. Send a product request through Messenger.
2. Provide the missing required fields across messages.
3. Reply `yes` after the order summary.
4. Inspect the bot response and Orders page.

## Cleanup

Remove instrumentation and this file only after the user confirms the issue is fixed or debugging is aborted.
