import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function RedirectAthleteResistencia({ params }: Props) {
  const { id } = await params;
  redirect(`/resistencia?atleta=${id}`);
}
