"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { isPlatformAdmin } from "@/lib/auth/access";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  createCoach,
  listCoaches,
  resetCoachPassword,
  updateCoach,
  type CoachSummary,
} from "@/lib/api/users";

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "detail" in err) {
    const detail = (err as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

type EditDraft = {
  name: string;
  email: string;
  photo_url: string;
  bio: string;
  phone: string;
};

function draftFromCoach(c: CoachSummary): EditDraft {
  return {
    name: c.name ?? "",
    email: c.email,
    photo_url: c.photo_url ?? "",
    bio: c.bio ?? "",
    phone: c.phone ?? "",
  };
}

export default function PreparadoresPage() {
  const { me, isLoading } = useAuth();
  const router = useRouter();
  const { pushToast } = useToast();
  const [coaches, setCoaches] = useState<CoachSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [resettingId, setResettingId] = useState<number | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<CoachSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCoaches(await listCoaches());
    } catch {
      pushToast("error", "No se pudo cargar la lista de preparadores");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    if (isLoading) return;
    if (!isPlatformAdmin(me)) {
      router.replace("/inicio");
      return;
    }
    void load();
  }, [isLoading, me, router, load]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      pushToast("error", "La contraseña temporal debe tener al menos 8 caracteres");
      return;
    }
    setCreating(true);
    try {
      await createCoach({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        bio: bio.trim() || undefined,
      });
      setName("");
      setEmail("");
      setPassword("");
      setBio("");
      pushToast("success", "Preparador creado. Debe cambiar la contraseña en el primer ingreso.");
      await load();
    } catch (err) {
      pushToast("error", apiErrorMessage(err, "No se pudo crear el preparador"));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (coach: CoachSummary) => {
    setEditingId(coach.id);
    setEditDraft(draftFromCoach(coach));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveEdit = async (coachId: number) => {
    if (!editDraft) return;
    setSavingEdit(true);
    try {
      await updateCoach(coachId, {
        name: editDraft.name.trim(),
        email: editDraft.email.trim().toLowerCase(),
        photo_url: editDraft.photo_url.trim() || null,
        bio: editDraft.bio.trim() || null,
        phone: editDraft.phone.trim() || null,
      });
      pushToast("success", "Preparador actualizado");
      cancelEdit();
      await load();
    } catch (err) {
      pushToast("error", apiErrorMessage(err, "No se pudo guardar los cambios"));
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleActive = async (coach: CoachSummary) => {
    try {
      await updateCoach(coach.id, { is_active: !coach.is_active });
      await load();
    } catch {
      pushToast("error", "No se pudo actualizar el estado");
    }
  };

  const handleResetPasswordClick = (coach: CoachSummary) => {
    if (resettingId !== null) return;
    setResetPasswordTarget(coach);
  };

  const handleResetPasswordConfirm = async () => {
    if (!resetPasswordTarget || resettingId !== null) return;
    const coach = resetPasswordTarget;
    setResettingId(coach.id);
    try {
      const { temporary_password } = await resetCoachPassword(coach.id);
      pushToast(
        "success",
        `Contraseña temporal (copiala ahora): ${temporary_password}`,
      );
      setResetPasswordTarget(null);
      await load();
    } catch {
      pushToast("error", "No se pudo restablecer la contraseña");
    } finally {
      setResettingId(null);
    }
  };

  if (isLoading || !isPlatformAdmin(me)) {
    return <main className="min-h-[40vh] bg-slate-50" />;
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Preparadores</h1>
        <p className="text-sm text-slate-500 mt-1">
          Alta, edición y baja lógica de cuentas coach. Cada uno ve solo su plantel.
        </p>
      </header>

      <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Nuevo preparador</h2>
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Contraseña temporal</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Descripción (opcional)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {creating ? "Creando…" : "Crear preparador"}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <h2 className="text-base font-semibold text-slate-700 px-6 py-4 border-b border-slate-100">
          Listado
        </h2>
        {loading ? (
          <p className="p-6 text-sm text-slate-400">Cargando…</p>
        ) : coaches.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">No hay preparadores coach todavía.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {coaches.map((c) => (
              <li key={c.id} className="px-6 py-4 space-y-4">
                {editingId === c.id && editDraft ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
                      <input
                        value={editDraft.name}
                        onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                      <input
                        type="email"
                        value={editDraft.email}
                        onChange={(e) => setEditDraft({ ...editDraft, email: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">URL foto</label>
                      <input
                        value={editDraft.photo_url}
                        onChange={(e) => setEditDraft({ ...editDraft, photo_url: e.target.value })}
                        placeholder="https://…"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Teléfono</label>
                      <input
                        value={editDraft.phone}
                        onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
                      <textarea
                        value={editDraft.bio}
                        onChange={(e) => setEditDraft({ ...editDraft, bio: e.target.value })}
                        rows={2}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={savingEdit}
                        onClick={() => void saveEdit(c.id)}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                      >
                        {savingEdit ? "Guardando…" : "Guardar"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-4 py-2 border border-slate-200 text-sm rounded-lg"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex gap-3">
                      {c.photo_url ? (
                        <img
                          src={c.photo_url}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover bg-slate-100 shrink-0"
                        />
                      ) : (
                        <span className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold flex items-center justify-center shrink-0">
                          {(c.name ?? c.email).slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div>
                        <p className="font-medium text-slate-800">{c.name ?? c.email}</p>
                        <p className="text-sm text-slate-500">{c.email}</p>
                        {c.phone && <p className="text-sm text-slate-500">{c.phone}</p>}
                        {c.bio && <p className="text-sm text-slate-600 mt-1">{c.bio}</p>}
                        <p className="text-xs text-slate-400 mt-1">
                          {c.athlete_count} atletas ·{" "}
                          {c.is_active ? (
                            <span className="text-emerald-600">Activo</span>
                          ) : (
                            <span className="text-red-600">Inactivo</span>
                          )}
                          {c.must_change_password && " · Pendiente cambio de contraseña"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={resettingId === c.id}
                        onClick={() => handleResetPasswordClick(c)}
                        className="text-sm px-3 py-1.5 rounded-lg border border-amber-200 text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                      >
                        {resettingId === c.id ? "Generando…" : "Restablecer contraseña"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleActive(c)}
                        className={`text-sm px-3 py-1.5 rounded-lg border ${
                          c.is_active
                            ? "border-red-200 text-red-700 hover:bg-red-50"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {c.is_active ? "Desactivar" : "Reactivar"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={resetPasswordTarget !== null}
        title="Nueva contraseña temporal"
        description={
          resetPasswordTarget
            ? `Se generará una contraseña nueva para ${resetPasswordTarget.email}. Se cerrarán sus sesiones abiertas.`
            : ""
        }
        confirmLabel="Generar contraseña"
        variant="primary"
        isLoading={resettingId !== null}
        onCancel={() => {
          if (resettingId === null) setResetPasswordTarget(null);
        }}
        onConfirm={() => void handleResetPasswordConfirm()}
      />
    </main>
  );
}
