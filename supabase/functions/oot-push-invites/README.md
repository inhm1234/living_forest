# oot-push-invites

Current recovery copy for the deployed Edge Function.

## Authentication
- Dashboard setting: **Verify JWT with legacy secret = OFF**
- Inbound webhook authentication: request header `x-oot-webhook-secret`
  must match the runtime secret `OOT_PUSH_WEBHOOK_SECRET`.
- The legacy `anon` / `service_role` JWT API keys are disabled for this project.

## Supabase backend key
Hosted Edge Functions read the new opaque secret key from the automatically
provided `SUPABASE_SECRET_KEYS` JSON environment variable:

```ts
const secretKey = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")?.default ?? "";
```

Do **not** reintroduce `SUPABASE_SERVICE_ROLE_KEY`, and never place any secret
API key in Database Webhook headers or browser code.

## Required runtime secrets / environment
- `SUPABASE_URL` (host-provided)
- `SUPABASE_SECRET_KEYS` (host-provided; uses `default`)
- `OOT_PUSH_WEBHOOK_SECRET`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

Secret values are intentionally not stored in GitHub.
