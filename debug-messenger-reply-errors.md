# Debug Session: Messenger Reply Errors

Status: [OPEN]
Session: messenger-reply-errors

## Symptom
User provided a worker log export and requested that the Messenger reply errors be fixed.

## Falsifiable hypotheses
1. Messenger reply payload or recipient ID is malformed or incomplete.
2. Meta Graph API access token, permissions, or expiry causes the send request to fail.
3. Workspace/channel configuration or integration state is missing before dispatch.
4. Worker retry, job serialization, or duplicate processing causes the failure.
5. Error handling hides the actual Graph API response behind a generic error.

## Evidence log
- Pending initial analysis of the supplied worker log.

## Changes
- No business logic changes made.
