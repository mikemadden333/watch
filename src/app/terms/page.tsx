import LegalPage from "@/components/LegalPage";
import { TERMS } from "@/lib/legalDocs";

export const metadata = { title: "Terms of Service — Watch" };

export default function TermsPage() {
  return <LegalPage doc={TERMS} />;
}
