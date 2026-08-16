/* ============================================================
   Watch Communications tab — your words, from the facts.
   One flow: pick the verified incident, pick the audience,
   Watch drafts in the network's own voice with the facts locked.
   The reference library is how the voice gets there. Nothing
   sends from Watch; copies log to Record.
   ============================================================ */

import CommsComposer from "@/components/comms/CommsComposer";
import type { NetworkData } from "@/lib/networkData";
import { PERMANENT_DISCLAIMER } from "@/lib/legal";

export default function CommsView({
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

  return (
    <>
      <div className="v2hero">
        <div className="micro">Communications</div>
        <div className="sentence">Write to families about what happened.</div>
        <p className="para" style={{ maxWidth: 660 }}>
          Pick an incident and who it&apos;s for. Watch writes a first draft from the verified facts, in your
          school&apos;s voice. You edit it and send it yourself. <b>Nothing goes out from Watch.</b>
        </p>
      </div>

      <div className="actwrap">
        <CommsComposer
          slug={slug}
          city={data.city}
          networkName={data.tenantName}
          campuses={data.campuses}
          incidents={data.incidents.slice(0, 40)}
          statuses={data.statuses}
          defaultCampus={defaultCampus}
        />
        <p className="quiet" style={{ marginTop: 34 }}>{PERMANENT_DISCLAIMER}</p>
      </div>
    </>
  );
}
