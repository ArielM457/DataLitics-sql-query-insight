"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { validateInviteCode, markCodeUsed, addPendingUser } from "@/lib/mocks/users.mock";
import { User, Building2, ChevronLeft, AlertCircle, Loader2 } from "lucide-react";

type AccountType = "employee" | "company" | null;

export default function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const { setMockProfile } = useAuth();

  const [accountType, setAccountType] = useState<AccountType>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }

    setLoading(true);
    setError(null);

    try {
      if (accountType === "employee") {
        const validation = validateInviteCode(inviteCode);
        if (!validation.valid) { setError(validation.reason); setLoading(false); return; }

        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) await updateProfile(user, { displayName: name.trim() });

        markCodeUsed(inviteCode);

        addPendingUser({
          uid: user.uid,
          email: user.email!,
          name: name.trim() || user.email!,
          tenantId: validation.data.tenantId,
          companyName: validation.data.companyName,
        });

        setMockProfile(user.uid, "analyst", validation.data.tenantId, "pending");
        router.push("/pending");

      } else if (accountType === "company") {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) await updateProfile(user, { displayName: name.trim() });

        setMockProfile(user.uid, "admin", "", "active");
        router.push("/join");
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const messages: Record<string, string> = {
        "auth/email-already-in-use": "Ya existe una cuenta con ese email.",
        "auth/invalid-email": "Email inválido.",
        "auth/weak-password": "La contraseña es demasiado débil.",
      };
      setError(messages[code ?? ""] ?? "Error al registrarse. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full border border-brand-light rounded-xl px-4 py-2.5 text-brand-deepest placeholder:text-brand-mid/70 focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand-dark transition-all disabled:bg-brand-light/30 text-sm";

  return (
    <form onSubmit={handleRegister} className="space-y-4">

      {!accountType ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-brand-deepest mb-2">¿Cómo quieres unirte?</p>

          <button
            type="button"
            onClick={() => setAccountType("employee")}
            className="w-full border-2 border-brand-light rounded-2xl p-4 text-left hover:border-brand-dark hover:bg-brand-light/30 transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center shrink-0 group-hover:bg-brand-dark/10 transition-colors">
                <User size={18} className="text-brand-dark" />
              </div>
              <div>
                <p className="font-semibold text-brand-deepest group-hover:text-brand-dark transition-colors">
                  Pertenezco a una empresa
                </p>
                <p className="text-sm text-brand-mid mt-0.5">
                  Tengo un código de invitación que me dio mi empresa.
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAccountType("company")}
            className="w-full border-2 border-brand-light rounded-2xl p-4 text-left hover:border-brand-dark hover:bg-brand-light/30 transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center shrink-0 group-hover:bg-brand-dark/10 transition-colors">
                <Building2 size={18} className="text-brand-dark" />
              </div>
              <div>
                <p className="font-semibold text-brand-deepest group-hover:text-brand-dark transition-colors">
                  Quiero unir mi empresa
                </p>
                <p className="text-sm text-brand-mid mt-0.5">
                  Soy administrador y quiero conectar nuestra base de datos.
                </p>
              </div>
            </div>
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setAccountType(null)}
            className="flex items-center gap-1.5 text-sm text-brand-dark hover:text-brand-deepest font-medium transition-colors"
          >
            <ChevronLeft size={16} />
            {accountType === "employee" ? "Pertenezco a una empresa" : "Unir mi empresa"}
          </button>

          <div>
            <label className="block text-sm font-medium text-brand-deepest mb-1.5">Nombre</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" disabled={loading} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-deepest mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@empresa.com" required disabled={loading} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-deepest mb-1.5">Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required disabled={loading} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-deepest mb-1.5">Confirmar contraseña</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repite tu contraseña" required disabled={loading} className={inputClass} />
          </div>

          {accountType === "employee" && (
            <div>
              <label className="block text-sm font-medium text-brand-deepest mb-1.5">
                Código de empresa
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Ej: AB12CD"
                required
                disabled={loading}
                maxLength={6}
                className={`${inputClass} font-mono tracking-widest`}
              />
              <p className="text-xs text-brand-mid mt-1">
                Solicita este código a tu administrador.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              !email.trim() ||
              !password.trim() ||
              !confirm.trim() ||
              (accountType === "employee" && inviteCode.length !== 6)
            }
            className="w-full bg-brand-dark text-white py-2.5 rounded-xl font-semibold hover:bg-brand-deepest disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-brand text-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Creando cuenta...
              </span>
            ) : accountType === "company" ? (
              "Continuar con datos de empresa"
            ) : (
              "Solicitar acceso"
            )}
          </button>
        </>
      )}

      <p className="text-sm text-center text-brand-mid">
        ¿Ya tienes cuenta?{" "}
        <button type="button" onClick={onSwitch} className="text-brand-dark hover:text-brand-deepest font-semibold transition-colors">
          Inicia sesión
        </button>
      </p>
    </form>
  );
}
