import LegalPage from "@/components/LegalPage";
import { PRIVACY } from "@/lib/legalDocs";

export const metadata = { title: "Privacy Policy — Watch" };

export default function PrivacyPage() {
  return <LegalPage doc={PRIVACY} />;
}
