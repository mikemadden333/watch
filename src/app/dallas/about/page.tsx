import Markdown from "@/components/Markdown";
import { ABOUT_WATCH } from "@/lib/aboutContent";

export default function DallasAbout() {
  return (
    <div className="v2prose">
      <Markdown content={ABOUT_WATCH} />
    </div>
  );
}
