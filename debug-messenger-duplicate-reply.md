# Debug session: messenger-duplicate-reply

Status: [OPEN]

## Symptom
Messenger conversation repeats the saved order summary and the human-agent handoff prompt after the customer sends a follow-up.

## Hypotheses
1. The inbound Messenger webhook/event is delivered or consumed more than once.
2. The worker job is retried after the outbound message was already sent.
3. The AI/flow state does not persist or is read with a stale conversation context.
4. A handoff/automation rule matches the same inbound event repeatedly.
5. The outbound send succeeds but an error in a later processing step causes duplicate processing.

## Required runtime evidence
- Builder webhook receipt and event/message IDs.
- Worker job IDs, attempts, completion/failure records.
- Outbound Messenger send IDs and status.
- Conversation/automation decisions around the same timestamp.
