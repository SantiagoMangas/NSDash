import { TeamPlantelClient } from "./TeamPlantelClient";

type Props = {
  params: Promise<{ teamId: string }>;
};

export default async function EquipoPlantelPage({ params }: Props) {
  const { teamId: raw } = await params;
  const teamId = Number.parseInt(raw, 10);
  if (!Number.isFinite(teamId)) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-sm text-red-600">ID de equipo no válido.</p>
      </main>
    );
  }
  return <TeamPlantelClient teamId={teamId} />;
}
