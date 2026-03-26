"use client";

import { useState } from "react";
import { X, Sparkles, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { submitSkillRequest } from "@/lib/skillRequests";

interface Props {
  onClose: () => void;
}

export default function SkillRequestModal({ onClose }: Props) {
  const { user, tenantId } = useAuth();
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [benefit, setBenefit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = title.trim().length > 0 && why.trim().length > 0 && benefit.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await submitSkillRequest({
        title: title.trim(),
        why: why.trim(),
        benefit: benefit.trim(),
        user_uid: user?.uid ?? "",
        user_email: user?.email ?? "",
        tenant_id: tenantId ?? "",
      });
      setSubmitted(true);
    } catch {
      setError("No se pudo enviar la solicitud. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-brand-light overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-light bg-brand-light/20">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-brand-dark" />
            <h2 className="text-base font-semibold text-brand-deepest">Solicitar nueva skill</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-brand-light/60 text-brand-mid transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        {submitted ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <CheckCircle size={40} className="text-green-500" />
            <p className="font-semibold text-brand-deepest text-lg">¡Solicitud enviada!</p>
            <p className="text-sm text-brand-dark/60 max-w-xs">
              Tu solicitud fue registrada. Podrás ver el estado desde el panel de administración.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-5 py-2 rounded-xl bg-brand-dark text-white text-sm font-medium hover:bg-brand-deepest transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-brand-dark/60">
              Describe la skill que te gustaría que el sistema implemente para mejorar tu trabajo.
            </p>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brand-deepest uppercase tracking-wide">
                Nombre de la skill <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Análisis de tendencias semanales"
                className="w-full border border-brand-light rounded-xl px-3 py-2.5 text-sm text-brand-deepest placeholder:text-brand-mid/60 focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand-dark transition-all"
                maxLength={120}
              />
            </div>

            {/* Why */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brand-deepest uppercase tracking-wide">
                ¿Por qué necesitas esta skill? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="Describe el contexto y qué problema resolvería..."
                rows={3}
                className="w-full border border-brand-light rounded-xl px-3 py-2.5 text-sm text-brand-deepest placeholder:text-brand-mid/60 focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand-dark transition-all resize-none"
                maxLength={500}
              />
            </div>

            {/* Benefit */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brand-deepest uppercase tracking-wide">
                ¿Cómo mejoraría tu trabajo? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={benefit}
                onChange={(e) => setBenefit(e.target.value)}
                placeholder="Explica el impacto esperado en tu productividad o análisis..."
                rows={3}
                className="w-full border border-brand-light rounded-xl px-3 py-2.5 text-sm text-brand-deepest placeholder:text-brand-mid/60 focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand-dark transition-all resize-none"
                maxLength={500}
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-brand-dark border border-brand-light hover:bg-brand-light/40 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium bg-brand-dark text-white hover:bg-brand-deepest disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                Enviar solicitud
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
