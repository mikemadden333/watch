/* About — the essay in Mike's voice, followed by the team colophon.
   Erin is named both in the essay and here, as a Founding Product Partner. */

import Markdown from "@/components/Markdown";
import { ABOUT_WATCH } from "@/lib/aboutContent";

export default function AboutView() {
  return (
    <div className="v2prose">
      <Markdown content={ABOUT_WATCH} />

      <div className="colophon">
        <div className="micro">Who builds Watch</div>
        <p className="colo-org">
          Watch is designed, built, and operated by <b>Madden Education Advisory, LLC</b> — an
          education practice in Chicago serving K–12 school networks.
        </p>
        <div className="person">
          <span className="mono-av">MM</span>
          <div>
            <div className="pn">Mike Madden</div>
            <div className="pr">Founder &amp; Principal</div>
          </div>
        </div>
        <div className="person">
          <span className="mono-av alt">ML</span>
          <div>
            <div className="pn">Moon Lee</div>
            <div className="pr">Founding Product Partner · Chief Technology Officer</div>
          </div>
        </div>
        <div className="person">
          <span className="mono-av alt">EM</span>
          <div>
            <div className="pn">Erin Madden</div>
            <div className="pr">Founding Product Partner · Student Voice</div>
          </div>
        </div>
      </div>
    </div>
  );
}
