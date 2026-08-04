/* ============================================================
   Watch V2 Act (directive §5). Two sections on one calm screen:
   A. COMMUNICATIONS — Families / Staff / Students drafts built from
      the verified incident record (or neutral sample values when
      nothing is active). Editable; copy logs to Record; never sends.
   B. RESPONSE PLAN — national best-practice placeholder, replaceable
      per tenant in Admin. Watch never generates and never auto-sends.
   ============================================================ */

import ActDrafts from "@/components/ActDrafts";
import Markdown from "@/components/Markdown";
import type { NetworkData } from "@/lib/networkData";
import type { Campus } from "@/lib/types";
import { buildMerge, allDrafts } from "@/lib/act/templates";
import { DEFAULT_RESPONSE_PLAN } from "@/lib/act/responsePlan";
import { PERMANENT_DISCLAIMER } from "@/lib/legal";
import { incidentTypeWord, milesPhrase, occurredPhrase, clockOf } from "@/lib/voice";

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export default function ActView({
  data,
  slug,
  view,
  campus,
}: {
  data: NetworkData;
  slug: string;
  view: "ceo" | "leader";
  campus?: string;
}) {
  const rank: Record<string, number> = { ALERT: 0, ELEVATED: 1, MONITOR: 2, CLEAR: 3 };
  const sorted = [...data.campuses].sort((a, x) => {
    const sa = data.statuses.find((s) => s.campusCode === a.code)?.status ?? "CLEAR";
    const sx = data.statuses.find((s) => s.campusCode === x.code)?.status ?? "CLEAR";
    return rank[sa] - rank[sx];
  });
  const c: Campus | undefined =
    (view === "leader" && campus ? data.campuses.find((x) => x.code === campus) : undefined) ?? sorted[0];

  const status = c ? data.statuses.find((s) => s.campusCode === c.code) : undefined;
  // pick the incident that DROVE the posture — highest tier, then most recent —
  // so the drafts and fact strip describe the right shooting, not just the
  // first array match (which could be an old, fatal one at a different block).
  const rankTier: Record<string, number> = { CONFIRMED: 0, CORROBORATED: 1, REPORTED: 2 };
  const incident =
    c && (status?.status === "ALERT" || status?.status === "ELEVATED")
      ? [...data.incidents]
          .filter((i) => i.nearestCampusCode === c.code)
          .sort(
            (a, b) =>
              (rankTier[a.tier] ?? 3) - (rankTier[b.tier] ?? 3) ||
              new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
          )[0]
      : undefined;

  const { merge, active, incidentId } = c
    ? buildMerge(c, data.city, incident, status)
    : { merge: null, active: false, incidentId: null };
  const drafts = merge ? allDrafts(merge) : [];

  return (
    <>
      <div className="v2hero">
        <div className="micro">Act · communications &amp; response plan</div>
        <div className="sentence">
          {active
            ? `Your words for ${c!.name} are ready — built from the facts.`
            : "Nothing is active. Your words are ready the moment something qualifies."}
        </div>
        {active && incident ? (
          <div
            style={{
              marginTop: 14,
              display: "inline-flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              gap: 0,
              fontSize: 13.5,
              lineHeight: 1.5,
              color: "var(--ink)",
              background: status?.status === "ALERT" ? "var(--alertbg)" : "var(--elevatedbg)",
              border: `1px solid ${status?.status === "ALERT" ? "var(--alert)" : "var(--line2)"}`,
              borderRadius: 9,
              padding: "9px 14px",
            }}
          >
            <b>{cap(incidentTypeWord(incident))}</b>
            {incident.victimNote ? <span>&nbsp;· {incident.victimNote}</span> : null}
            <span style={{ color: "var(--mut)" }}>
              &nbsp;· {milesPhrase(incident.distanceMi, incident.bearing)} · occurred {occurredPhrase(incident.occurredAt).replace(/^./, (ch) => ch.toLowerCase())} · published {clockOf(incident.publishedAt)}
            </span>
          </div>
        ) : null}
        <p className="para" style={{ maxWidth: 720, marginTop: active && incident ? 16 : undefined }}>
          Watch drafts; you decide. Every message below is editable, and <b>nothing sends from Watch</b> — you copy
          the words into your own email or text system. Copies are logged to Record.
        </p>
      </div>

      <div className="actwrap">
        <div className="section-label" style={{ marginBottom: 6 }}>Communications</div>
        {!active ? (
          <div className="banner banner-neutral">
            No active incident — these drafts fill themselves when something qualifies. What you see now uses sample values.
          </div>
        ) : null}
        {c ? (
          <ActDrafts drafts={drafts} slug={slug} campusCode={c.code} incidentId={incidentId} />
        ) : (
          <p className="para">No campuses configured.</p>
        )}

        <div className="section-label" style={{ margin: "44px 0 6px" }}>Response plan</div>
        <div className="banner banner-plan">
          Placeholder — national best practice. Replace with your district&apos;s plan in Admin → Response Plan.
        </div>
        <div className="v2prose" style={{ maxWidth: "none", margin: 0, padding: "18px 0 0" }}>
          <Markdown content={DEFAULT_RESPONSE_PLAN} />
        </div>

        <p className="quiet" style={{ marginTop: 34 }}>{PERMANENT_DISCLAIMER}</p>
      </div>
    </>
  );
}
