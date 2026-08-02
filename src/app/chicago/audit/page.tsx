import { redirect } from "next/navigation";

// Audit was renamed to Record in V2 (directive §6). Keep the old path working.
export default function ChicagoAudit() {
  redirect("/chicago/record");
}
