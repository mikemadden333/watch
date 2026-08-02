import Link from "next/link";
import MapView from "@/components/MapView";
import LiveFooter from "@/components/live/LiveFooter";
import { getNetworkData } from "@/lib/networkData";
import { CORRIDORS, scorePassage } from "@/lib/safePassage";
import { fmtCentral } from "@/lib/time";

/* Safe Passage — the "on your routes" surface. Scores precise incidents
   against each campus's walking corridors and shows what fell on a route,
   with a map overlay. The category-defining view: rings are round, but
   children walk in lines. */

export default async function SafePassage({ slug, base }: { slug: string; base: string }) {
  const data = await getNetworkData(slug);
  if (!data) {
    return (
      <div style={{ padding: "60px 28px", maxWidth: 560 }}>
        <div className="serif" style={{ fontSize: 24 }}>Safe Passage</div>
        <p style={{ marginTop: 12, fontSize: 13, color: "var(--mut)" }}>
          This network isn&apos;t connected. <Link href="/" className="btn" style={{ marginTop: 10 }}>← Watch</Link>
        </p>
      </div>
    );
  }

  const corridors = CORRIDORS[slug] ?? [];
  const scored = scorePassage(data.incidents, corridors);
  const totalOnRoute = scored.reduce((n, s) => n + s.onRoute.length, 0);

  // group corridors by campus for display
  const byCampus = new Map<string, typeof scored>();
  for (const s of scored) {
    const arr = byCampus.get(s.corridor.campusCode) ?? [];
    arr.push(s);
    byCampus.set(s.corridor.campusCode, arr);
  }
  const campusName = (code: string) => data.campuses.find((c) => c.code === code)?.name ?? code;

  return (
    <>
      {/* hero summary */}
      <div
        style={{
          margin: "20px 28px 0",
          border: "1px solid var(--line2)",
          background: totalOnRoute > 0 ? "var(--elevatedbg)" : "var(--clearbg)",
          borderRadius: 10,
          padding: "18px 22px",
        }}
      >
        <div className="micro">Safe Passage · walking corridors · live window</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
          <span className="serif" style={{ fontSize: 26, fontWeight: 600 }}>
            {totalOnRoute === 0 ? "All routes clear" : `${totalOnRoute} on a walking route`}
          </span>
          <span style={{ fontSize: 13, color: "var(--mut)" }}>
            {corridors.length} corridors · {data.campuses.length} campuses
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--mut)", lineHeight: 1.55, marginTop: 8, maxWidth: "72ch" }}>
          Rings are round, but children walk in lines. This scores precise incidents against the
          streets students actually travel — not just a radius. An incident <b>on a route</b> matters
          more than one an equal distance away in the opposite direction. Coarse, neighborhood-only
          signals are excluded here — a route needs a precise location. Corridors are configurable per
          campus. <b>Not a guarantee of safety.</b>
        </p>
      </div>

      <div className="wrap" style={{ paddingTop: 16 }}>
        <div className="main">
          <b style={{ fontSize: 14 }}>On your routes</b>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
            {[...byCampus.entries()].map(([code, list]) => {
              const hits = list.reduce((n, s) => n + s.onRoute.length, 0);
              return (
                <div key={code} className="card" style={{ padding: "14px 16px", borderColor: hits ? "var(--elevated)" : undefined }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <b>{campusName(code)}</b>
                    <span className={`pill ${hits ? "p-elevated" : "p-clear"}`}>
                      <span className="d" />
                      {hits ? `${hits} on route` : "routes clear"}
                    </span>
                  </div>
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    {list.map((s) => (
                      <div key={s.corridor.id}>
                        <div className="micro" style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>{s.corridor.name}</span>
                          <span>buffer {s.corridor.bufferMi} mi</span>
                        </div>
                        {s.onRoute.length === 0 ? (
                          <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 2 }}>No incidents on this route.</div>
                        ) : (
                          s.onRoute.map((r) => (
                            <div
                              key={r.incident.id}
                              style={{ marginTop: 6, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--panel)" }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{r.incident.headline}</span>
                                <span className={`pill badge-${r.incident.tier === "CONFIRMED" ? "conf" : r.incident.tier === "CORROBORATED" ? "corr" : "rep"}`}>
                                  {r.incident.tier}
                                </span>
                              </div>
                              <div className="micro" style={{ marginTop: 3 }}>
                                <b className="num">{r.distMi} mi off route</b> · {r.incident.source} · occurred {fmtCentral(r.incident.occurredAt) || "—"} · published {fmtCentral(r.incident.publishedAt) || "—"}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, fontSize: 10.5, color: "var(--mut)", fontFamily: "Menlo,monospace", textTransform: "uppercase", letterSpacing: 0.6 }}>
            Corridors are account config · precise incidents only · decision support, not a guarantee
          </div>
        </div>

        <div className="rail">
          <div className="card" style={{ padding: 16 }}>
            <div className="micro">How this works</div>
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink)", lineHeight: 1.55 }}>
              A corridor is the path kids walk, with a buffer. An incident inside the buffer is <b>on the
              route</b>. Distance is measured to the nearest point of the route, not to the campus — so a
              shooting on the walking street scores higher than one behind the school.
            </div>
            <hr className="hr" />
            <div className="micro">Legend</div>
            <div style={{ marginTop: 8, fontSize: 11.5, display: "flex", flexDirection: "column", gap: 6 }}>
              <div><span style={{ display: "inline-block", width: 16, height: 3, background: "#3A5A78", marginRight: 8, verticalAlign: "middle" }} />Walking corridor</div>
              <div><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "var(--clear)", marginRight: 8 }} />Confirmed incident</div>
              <div><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "var(--monitor)", marginRight: 8 }} />Corroborated</div>
            </div>
          </div>
        </div>
      </div>

      {/* map with corridor overlay */}
      <div style={{ padding: "0 4px" }}>
        <MapView
          campuses={data.campuses}
          incidents={data.incidents}
          statuses={data.statuses}
          nowIso={new Date().toISOString()}
          corridors={corridors.map((c) => ({ campusCode: c.campusCode, name: c.name, path: c.path, bufferMi: c.bufferMi }))}
        />
      </div>

      <LiveFooter data={data} />
    </>
  );
}
