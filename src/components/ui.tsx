import type { Status } from "@/lib/types";

export function pillClass(status: Status): string {
  switch (status) {
    case "CLEAR":
      return "p-clear";
    case "MONITOR":
      return "p-monitor";
    case "ELEVATED":
      return "p-elevated";
    case "ALERT":
      return "p-alert";
  }
}

export function statusColorVar(status: Status): string {
  switch (status) {
    case "CLEAR":
      return "var(--clear)";
    case "MONITOR":
      return "var(--monitor)";
    case "ELEVATED":
      return "var(--elevated)";
    case "ALERT":
      return "var(--alert)";
  }
}

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`pill ${pillClass(status)}`}>
      <span className="d" />
      {status}
    </span>
  );
}
