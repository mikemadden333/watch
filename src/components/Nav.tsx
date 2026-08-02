"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { label: "Briefing", href: "briefing", match: ["briefing"] },
  { label: "Map", href: "map", match: ["map"] },
  { label: "Safe Passage", href: "passage", match: ["passage"] },
  { label: "Campuses", href: "campuses", match: ["campuses"] },
  { label: "Alerts", href: "alerts", match: ["alerts"] },
  { label: "Audit", href: "audit", match: ["audit"] },
  { label: "Admin", href: "admin", match: ["admin"] },
];

export default function Nav({
  network,
  base,
  mark,
  user = "M. Reese · Safety Director",
  initials = "MR",
}: {
  network: string;
  base: string; // e.g. "/chicago"
  mark?: string; // tenant mark asset path (ink only, shown in the switcher)
  user?: string;
  initials?: string;
}) {
  const path = usePathname();
  const seg = path.split("/").filter(Boolean); // ["chicago","map",...]
  const current = seg[1] ?? "briefing";

  return (
    <div className="nav">
      <Link href={`${base}/briefing`} className="brand">
        <span className="dot" /> Watch
      </Link>
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={`${base}/${l.href}`}
          className={`link${l.match.includes(current) ? " on" : ""}`}
        >
          {l.label}
        </Link>
      ))}
      <div className="right">
        {/* tenant switcher — mark is always ink, never status-colored */}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {mark && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mark} alt="" width={20} height={20} style={{ display: "block" }} />
          )}
          <span className="micro">{network}</span>
        </span>
        <div className="avatar">{initials}</div>
        <span style={{ fontSize: 12, color: "var(--mut)" }}>{user}</span>
      </div>
    </div>
  );
}
