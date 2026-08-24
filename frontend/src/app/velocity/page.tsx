import { redirect } from "next/navigation";

/** Legacy route — velocity/MSS content lives under Resistencia in the main app. */
export default function VelocityPage() {
  redirect("/");
}
