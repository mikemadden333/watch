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
        <div className="micro">Communications · your words, from the facts</div>
        <div className="sentence">Every message starts at a verified incident — and sounds like you.</div>
        <p className="para" style={{ maxWidth: 740 }}>
          Three moves: pick the incident, pick who needs to hear from you, and Watch drafts the message —
          around facts locked from the record, in a voice learned from your own best communications. Switch the
          audience and the same facts re-voice for the new reader. Everything is editable, and{" "}
          <b>nothing sends from Watch</b> — you copy the words into your own system, and the copy is logged to Record.
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
