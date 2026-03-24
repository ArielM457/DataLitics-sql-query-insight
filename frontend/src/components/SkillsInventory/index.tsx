"use client";

import { useEffect, useState } from "react";
import { listSkills } from "@/lib/api";
import { BookOpen, Loader2, AlertCircle, Filter } from "lucide-react";

interface Skill {
  id: string;
  title: string;
  description: string;
  agent: string;
  category: string;
  tags: string[];
  active: boolean;
}

const AGENT_COLORS: Record<string, string> = {
  agent_intention: "bg-violet-100 text-violet-700",
  agent_sql: "bg-blue-100 text-blue-700",
  agent_execution: "bg-amber-100 text-amber-700",
  agent_insights: "bg-green-100 text-green-700",
  agent_analytics: "bg-indigo-100 text-indigo-700",
};

const AGENT_LABELS: Record<string, string> = {
  agent_intention: "Intención",
  agent_sql: "SQL",
  agent_execution: "Ejecución",
  agent_insights: "Insights",
  agent_analytics: "Analytics",
};

export default function SkillsInventory() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await listSkills();
        setSkills(data.skills);
        setAgents(data.agents);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visible = filter ? skills.filter((s) => s.agent === filter) : skills;

  return (
    <div className="border border-brand-light rounded-2xl bg-white shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-brand-light bg-brand-light/20">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-brand-dark" />
          <h2 className="text-lg font-semibold text-brand-deepest">
            Inventario de Skills
            {!loading && (
              <span className="ml-2 text-sm font-normal text-brand-dark/60">
                ({visible.length} de {skills.length})
              </span>
            )}
          </h2>
        </div>
        {/* Agent filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-brand-dark/60" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-brand-light rounded-lg px-3 py-1.5 text-sm bg-white text-brand-deepest focus:outline-none"
          >
            <option value="">Todos los agentes</option>
            {agents.map((a) => (
              <option key={a} value={a}>{AGENT_LABELS[a] ?? a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-brand-dark">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Cargando skills...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 px-5 py-4 text-amber-700 bg-amber-50">
          <AlertCircle size={15} className="shrink-0" />
          <span className="text-sm">No se pudieron cargar las skills. Verifica la conexión con el backend.</span>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-brand-mid">
          <BookOpen size={24} />
          <span className="text-sm">No hay skills para este agente.</span>
        </div>
      ) : (
        <div className="divide-y divide-brand-light/50">
          {visible.map((skill) => (
            <div key={skill.id} className="px-5 py-4 hover:bg-brand-light/10 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-brand-deepest text-sm">{skill.title}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${AGENT_COLORS[skill.agent] ?? "bg-brand-light text-brand-dark"}`}>
                      {AGENT_LABELS[skill.agent] ?? skill.agent}
                    </span>
                    {!skill.active && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactiva</span>
                    )}
                  </div>
                  <p className="text-sm text-brand-dark/70 mt-1">{skill.description}</p>
                  {skill.tags.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      {skill.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-brand-light/60 text-brand-dark px-2 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-brand-dark/40 whitespace-nowrap shrink-0 mt-0.5">{skill.category}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
