import LegalPage from "@/components/LegalPage";
import { MESSAGING } from "@/lib/legalDocs";

export const metadata = { title: "Text-message alerts — Watch" };

export default function MessagingPage() {
  return (
    <LegalPage
      doc={MESSAGING}
      footer={
        <div
          style={{
            padding: "14px 16px",
            border: "1px solid var(--line2)",
            borderRadius: 10,
            background: "var(--elevatedbg)",
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--ink)",
          }}
        >
          <b>In an emergency, call 911.</b> Watch text alerts are decision support, not an
          emergency service, and can be delayed or incomplete. The absence of a message is not a
          guarantee of safety.
        </div>
      }
    />
  );
}
