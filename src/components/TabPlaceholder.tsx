/* Temporary tab placeholder used during the V2 surface rebuild.
   Each unbuilt tab still opens with one sentence in the Watch voice,
   so the shell reads correctly while the tab is ported. Replaced in
   its own directive step. */

export default function TabPlaceholder({
  label,
  sentence,
  note,
}: {
  label: string;
  sentence: string;
  note?: string;
}) {
  return (
    <div className="v2hero">
      <div className="micro">{label}</div>
      <div className="sentence">{sentence}</div>
      <p className="para">
        {note ??
          "This tab is being built in the V2 surface rebuild — it arrives in an upcoming deploy preview. The data, rules, and honesty guarantees beneath it are already live and unchanged."}
      </p>
    </div>
  );
}
