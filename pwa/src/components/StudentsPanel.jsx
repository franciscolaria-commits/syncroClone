import React from 'react';

/**
 * Badge de estado parental para supervisión de entrenadores.
 * Permite identificar visualmente si un alumno menor de edad está pendiente de autorización legal
 * o si ya cuenta con la conformidad legal de su tutor.
 */
export function StudentParentalStatusBadge({ alumno }) {
  if (!alumno || !alumno.requiere_autorizacion_tutor) {
    return null;
  }

  if (!alumno.autorizacion_tutor_completada) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm" title={`Tutor: ${alumno.email_tutor || 'No asignado'}`}>
        🟡 Pendiente Tutor
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm">
      🟢 Tutor Autorizado
    </span>
  );
}

export default function StudentsPanel({ students = [], onSelectStudent, onDeactivate, onReactivate }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {students.map((alumno) => (
        <div
          key={alumno.id_usuario}
          className="p-4 rounded-xl border bg-zinc-900/60 border-zinc-800/60 flex flex-col justify-between gap-3"
        >
          <div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-zinc-100 truncate">
                {alumno.usuario?.email?.split('@')[0]}
              </h3>
              <StudentParentalStatusBadge alumno={alumno} />
            </div>
            <p className="text-[10px] text-zinc-500">{alumno.usuario?.email}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
