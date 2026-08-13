import { redirect } from "next/navigation";

/* The Act tab split into Action + Communications. Old links land on Action. */
export default async function ChicagoActRedirect({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; campus?: string }>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  if (sp.view) q.set("view", sp.view);
  if (sp.campus) q.set("campus", sp.campus);
  const s = q.toString();
  redirect(`/chicago/action${s ? "?" + s : ""}`);
}
