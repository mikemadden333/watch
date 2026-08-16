/* ============================================================
   Watch Action tab — the district's plan, made runnable.
   Top: the response runner (initiate → stepped, stamped checklist
   → after-action review → permanent history). Below: the plan
   itself — the district's own emergency operations plan, loaded
   and customized at onboarding (national-standard default until
   then). Watch is decision support, not dispatch.
   ============================================================ */

import ActionRunner, { type IncidentLite } from "@/components/action/ActionRunner";
import Markdown from "@/components/Markdown";
import type { NetworkData } from "@/lib/networkData";
import { DEFAULT_RESPONSE_PLAN } from "@/lib/act/responsePlan";
import { PERMANENT_DISCLAIMER } from "@/lib/legal";

export default function ActionView({
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
  const defaultCampus =
    (view === "leader" && campus ? data.campuses.find((c) => c.code === campus)?.code : undefined) ??
    sorted[0]?.code ??
    "";

  const rankTier: Record<string, number> = { CONFIRMED: 0, CORROBORATED: 1, REPORTED: 2 };
  const incidents: IncidentLite[] = [...data.incidents]
    .sort(
      (a, b) =>
        (rankTier[a.tier] ?? 3) - (rankTier[b.tier] ?? 3) ||
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    )
    .slice(0, 8)
    .map((i) => ({
      id: i.id,
      headline: i.headline,
      tier: i.tier,
      kind: i.kind,
      occurredAt: i.occurredAt,
      nearestCampusCode: i.nearestCampusCode,
      distanceMi: i.distanceMi,
      bearing: i.bearing,
    }));

  return (
    <>
      <div className="v2hero">
        <div className="micro">Action</div>
        <div className="sentence">Your plan, as a live checklist.</div>
        <p className="para" style={{ maxWidth: 660 }}>
          When something happens near a campus, you start a response. Watch turns your plan into a checklist,
          timestamps every step, and keeps the record. Today it shows the national-standard plan; your own plan
          loads at onboarding. <b>You start it. Watch never does.</b>
        </p>
      </div>

      <div className="actwrap">
        <ActionRunner slug={slug} campuses={data.campuses.map((c) => ({ code: c.code, name: c.name }))} incidents={incidents} defaultCampus={defaultCampus} />

        <details className="planreveal">
          <summary>
            <span className="mono">YOUR RESPONSE PLAN</span> — the source of the runbook above
            <span className="pr-hint">view ▾</span>
          </summary>
          <div className="banner banner-plan" style={{ marginTop: 14 }}>
            Placeholder — national best practice. At onboarding this becomes your district&apos;s own plan
            (Admin → Response Plan), and the runbook above is rebuilt from it.
          </div>
          <div className="v2prose" style={{ maxWidth: "none", margin: 0, padding: "18px 0 0" }}>
            <Markdown content={DEFAULT_RESPONSE_PLAN} />
          </div>
        </details>

        <p className="quiet" style={{ marginTop: 34 }}>{PERMANENT_DISCLAIMER}</p>
      </div>
    </>
  );
}
