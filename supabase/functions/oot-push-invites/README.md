# oot-push-invites

- Dashboard setting: **Verify JWT with legacy secret = OFF**
- Inbound authentication: `x-oot-webhook-secret` must equal `OOT_PUSH_WEBHOOK_SECRET`.
- Never put `SUPABASE_SERVICE_ROLE_KEY` in a Database Webhook header.
- Required secrets: `OOT_PUSH_WEBHOOK_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
