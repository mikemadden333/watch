import { redirect } from "next/navigation";

// Default the Campuses tab to the campus with the highest posture.
export default function CampusesIndex() {
  redirect("/chicago/campuses/eng");
}
