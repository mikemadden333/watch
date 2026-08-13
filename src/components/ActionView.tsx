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
        <div className="micro">Action · your plan, made runnable</div>
        <div className="sentence">The plan is loaded. When something happens, you run it — and Watch remembers.</div>
        <p className="para" style={{ maxWidth: 740 }}>
          At onboarding, Watch loads your district&apos;s own emergency action plan into this tab and tailors the
          runbook to it — your roles, your call chain, your language. What you see today is the national-standard
          default. When a serious incident demands it, <b>Initiate emergency response</b> turns the plan into a live
          checklist: every step stamped with who and when, closed only through an after-action review, kept
          permanently. Watch never activates a response on its own.
        </p>
      </div>

      <div className="actwrap">
        <div className="section-label" style={{ marginBottom: 8 }}>Emergency response</div>
        <ActionRunner slug={slug} campuses={data.campuses.map((c) => ({ code: c.code, name: c.name }))} incidents={incidents} defaultCampus={defaultCampus} />

        <div className="section-label" style={{ margin: "44px 0 6px" }}>Your response plan — the source of the runbook</div>
        <div className="banner banner-plan">
          Placeholder — national best practice. At onboarding this becomes your district&apos;s own plan
          (Admin → Response Plan), and the runbook above is rebuilt from it.
        </div>
        <div className="v2prose" style={{ maxWidth: "none", margin: 0, padding: "18px 0 0" }}>
          <Markdown content={DEFAULT_RESPONSE_PLAN} />
        </div>

        <p className="quiet" style={{ marginTop: 34 }}>{PERMANENT_DISCLAIMER}</p>
      </div>
    </>
  );
}
