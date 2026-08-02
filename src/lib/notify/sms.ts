/* ============================================================
   SMS delivery — Twilio (KEY-GATED, dark until configured).
   Fires a text on ALERT escalation. Off unless all of TWILIO_ACCOUNT_SID,
   TWILIO_AUTH_TOKEN, TWILIO_FROM, and WATCH_ALERT_SMS_TO are set — same
   graceful-degrade pattern as the Citizen / licensed-news slots. Never
   throws into the delivery path.

   Compliance: the body carries a 911 pointer and a STOP opt-out. Real
   consent/opt-in handling belongs in the account onboarding; this is the
   send mechanism.
   ============================================================ */

export function smsConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.WATCH_ALERT_SMS_TO &&
    // send via an A2P Messaging Service (preferred) or a raw From number
    (process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_FROM)
  );
}

export async function sendAlertSms(
  body: string
): Promise<{ sent: number; recipients: number; degraded: boolean; error?: string }> {
  if (!smsConfigured()) return { sent: 0, recipients: 0, degraded: true };
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const from = process.env.TWILIO_FROM;
  const tos = (process.env.WATCH_ALERT_SMS_TO || "").split(",").map((s) => s.trim()).filter(Boolean);
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  let sent = 0;
  let error: string | undefined;
  for (const to of tos) {
    try {
      // prefer the A2P Messaging Service; fall back to a raw From number
      const fields: Record<string, string> = { To: to, Body: body.slice(0, 600) };
      if (messagingServiceSid) fields.MessagingServiceSid = messagingServiceSid;
      else if (from) fields.From = from;
      const params = new URLSearchParams(fields);
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      if (res.ok) sent++;
      else error = `Twilio ${res.status}`;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
  return { sent, recipients: tos.length, degraded: false, error };
}

/** Build the ALERT text — plain, actionable, with the required pointers. */
export function alertSmsBody(campusName: string, detail: string, occurredLocal?: string): string {
  const when = occurredLocal ? ` (occurred ${occurredLocal})` : "";
  return `WATCH ALERT — ${campusName}: ${detail}${when}. Open Watch to verify. In an emergency call 911; not a guarantee of safety. — Madden Education Advisory. Reply STOP to opt out.`;
}
