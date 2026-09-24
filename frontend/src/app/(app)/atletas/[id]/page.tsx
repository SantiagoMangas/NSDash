import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AthleteIndexPage({ params }: Props) {
  const { id } = await params;
  redirect(`/atletas/${id}/fuerza`);
}
