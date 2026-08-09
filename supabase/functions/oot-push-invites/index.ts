import { createClient } from "npm:@supabase/supabase-js@2";
import { sendNotification } from "npm:web-push-neo@0.1.2";

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

type WebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: {
    id?: string;
    push_due_at?: string | null;
  };
};

type PushSubscriptionRow = {
  subscriptionId?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type PushJob = {
  invite_id: string;
  from_user_id: string;
  to_user_id: string;
  expires_at: string;
  delivery_mode: string;
  subscriptions: PushSubscriptionRow[];
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SECRET_KEYS = Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}";
let SUPABASE_SECRET_KEY = "";
try {
  SUPABASE_SECRET_KEY = JSON.parse(SUPABASE_SECRET_KEYS)?.default ?? "";
} catch {
  SUPABASE_SECRET_KEY = "";
}
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "https://todayforest.pages.dev/";
const OOT_PUSH_WEBHOOK_SECRET = Deno.env.get("OOT_PUSH_WEBHOOK_SECRET") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isAuthorizedWebhookRequest(request: Request): boolean {
  const webhookSecret = request.headers.get("x-oot-webhook-secret") ?? "";
  return Boolean(OOT_PUSH_WEBHOOK_SECRET)
    && webhookSecret === OOT_PUSH_WEBHOOK_SECRET;
}

function statusCodeOf(error: unknown): number {
  if (typeof error === "object" && error && "statusCode" in error) {
    return Number((error as { statusCode?: number }).statusCode || 0);
  }
  return 0;
}

async function disableExpiredSubscription(subscriptionId?: string) {
  if (!subscriptionId) return;
  await supabase
    .from("oot_push_subscriptions")
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq("id", subscriptionId);
}

async function markPushResult(inviteId: string, success: boolean, errorMessage = "") {
  const { error } = await supabase.rpc("oot_mark_push_result", {
    p_invite_id: inviteId,
    p_success: success,
    p_error: errorMessage || null,
  });
  if (error) console.error("mark push result failed", inviteId, error);
}

async function sendJob(job: PushJob) {
  const subscriptions = Array.isArray(job.subscriptions) ? job.subscriptions : [];
  if (!subscriptions.length) {
    await markPushResult(job.invite_id, false, "NO_ENABLED_SUBSCRIPTIONS");
    return;
  }

  const payload = JSON.stringify({
    title: "원오브텐 한 판 초대",
    body: "친구가 원오브텐 한 판을 기다리고 있어요. 눌러서 확인해 보세요.",
    icon: "https://todayforest.pages.dev/assets/pwa/icon-192.png",
    badge: "https://todayforest.pages.dev/assets/pwa/icon-192.png",
    tag: `oot-invite-${job.invite_id}`,
    inviteId: job.invite_id,
    expiresAt: job.expires_at,
    url: `https://todayforest.pages.dev/one-of-ten-friend.html?invite=${encodeURIComponent(job.invite_id)}`,
  });

  let successCount = 0;
  const errors: string[] = [];

  for (const subscription of subscriptions) {
    try {
      await sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        payload,
        {
          vapidDetails: {
            subject: VAPID_SUBJECT,
            publicKey: VAPID_PUBLIC_KEY,
            privateKey: VAPID_PRIVATE_KEY,
          },
          TTL: 600,
          urgency: "high",
          topic: `oot-${job.invite_id.replaceAll("-", "").slice(0, 28)}`,
          signal: AbortSignal.timeout(10000),
        },
      );
      successCount += 1;
    } catch (error) {
      const statusCode = statusCodeOf(error);
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${statusCode || "ERR"}:${message}`);
      if (statusCode === 404 || statusCode === 410) {
        await disableExpiredSubscription(subscription.subscriptionId);
      }
    }
  }

  await markPushResult(
    job.invite_id,
    successCount > 0,
    successCount > 0 ? "" : errors.join(" | ").slice(0, 1800),
  );
}

async function processDuePushes() {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error("PUSH_SECRETS_MISSING");
  }

  const staleBefore = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  await supabase
    .from("oot_invites")
    .update({ push_status: "pending", push_due_at: new Date().toISOString() })
    .eq("push_status", "processing")
    .lt("push_requested_at", staleBefore)
    .is("receiver_seen_at", null);

  const { data, error } = await supabase.rpc("oot_claim_due_push_invites", { p_limit: 20 });
  if (error) throw error;

  const jobs = (Array.isArray(data) ? data : []) as PushJob[];
  for (const job of jobs) {
    await sendJob(job);
  }

  return jobs.length;
}

async function runBackground(payload: WebhookPayload) {
  try {
    const dueAt = Date.parse(payload.record?.push_due_at || "");
    if (Number.isFinite(dueAt)) {
      const waitMs = Math.max(0, Math.min(12000, dueAt - Date.now() + 250));
      if (waitMs > 0) await sleep(waitMs);
    }
    const processed = await processDuePushes();
    console.log("oot push jobs processed", processed);
  } catch (error) {
    console.error("oot push background error", error);
  }
}

Deno.serve(async (request) => {
  if (request.method === "GET") {
    return Response.json({ ok: true, function: "oot-push-invites" });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!isAuthorizedWebhookRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: WebhookPayload = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  EdgeRuntime.waitUntil(runBackground(payload));
  return Response.json({ accepted: true }, { status: 202 });
});