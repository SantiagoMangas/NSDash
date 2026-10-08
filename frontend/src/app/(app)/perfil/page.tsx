"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { uploadAthletePhoto } from "@/lib/api/uploads";
import { changePassword, updateMe } from "@/lib/api/users";

export default function PerfilPage() {
  const { me, refreshMe } = useAuth();
  const { pushToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const obligatorio = searchParams.get("obligatorio") === "1";

  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!me) return;
    setName(me.name ?? "");
    setPhotoUrl(me.photo_url ?? "");
    setBio(me.bio ?? "");
    setPhone(me.phone ?? "");
  }, [me]);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateMe({
        name: name.trim() || null,
        photo_url: photoUrl.trim() || null,
        bio: bio.trim() || null,
        phone: phone.trim() || null,
      });
      await refreshMe();
      pushToast("success", "Perfil actualizado");
    } catch {
      pushToast("error", "No se pudo guardar el perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePhotoFile = async (file: File | null) => {
    if (!file) return;
    try {
      const url = await uploadAthletePhoto(file);
      setPhotoUrl(url);
      pushToast("success", "Foto subida. Guardá el perfil para confirmar.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al subir la foto";
      pushToast("error", message);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      pushToast("error", "La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      pushToast("error", "Las contraseñas nuevas no coinciden");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await refreshMe();
      pushToast("success", "Contraseña actualizada");
      if (obligatorio) {
        router.replace("/inicio");
      }
    } catch {
      pushToast("error", "No se pudo cambiar la contraseña. Revisá la contraseña actual.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (!me) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10 text-sm text-slate-500">Cargando perfil…</main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Mi perfil</h1>
        <p className="text-sm text-slate-500 mt-1">{me.email}</p>
        {obligatorio && (
          <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Tenés una contraseña temporal. Cambiala antes de usar el resto de la aplicación.
          </p>
        )}
      </header>

      <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-700">Datos personales</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Foto (URL)</label>
            <input
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-2 text-sm"
              onChange={(e) => void handlePhotoFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Teléfono</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {savingProfile ? "Guardando…" : "Guardar perfil"}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-700">Contraseña</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Contraseña actual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Confirmar nueva contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {savingPassword ? "Actualizando…" : "Cambiar contraseña"}
          </button>
        </form>
      </section>
    </main>
  );
}
