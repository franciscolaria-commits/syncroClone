import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useQueryClient } from '@tanstack/react-query';

export default function MembershipModal({ gymInfo, onComplete }) {
  const [selectedMembresia, setSelectedMembresia] = useState('');
  const [selectedPaqueteId, setSelectedPaqueteId] = useState('');
  const [clasesCompradas, setClasesCompradas] = useState('');
  const [availablePackages, setAvailablePackages] = useState(
    Array.isArray(gymInfo?.gym_paquetes_clases) ? gymInfo.gym_paquetes_clases : []
  );
  const [loading, setLoading] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (Array.isArray(gymInfo?.gym_paquetes_clases) && gymInfo.gym_paquetes_clases.length > 0) {
      setAvailablePackages(gymInfo.gym_paquetes_clases);
    } else {
      const coachId = gymInfo?.id_usuario || gymInfo?.id_entrenador;
      if (coachId) {
        setLoadingPackages(true);
        api.get(`/api/v1/qr/${coachId}`)
          .then(data => {
            if (data?.gym_paquetes_clases && Array.isArray(data.gym_paquetes_clases) && data.gym_paquetes_clases.length > 0) {
              setAvailablePackages(data.gym_paquetes_clases);
            }
          })
          .catch(() => {})
          .finally(() => setLoadingPackages(false));
      }
    }
  }, [gymInfo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMembresia) return;

    let paqueteId = null;
    let clasesTotal = null;

    if (selectedMembresia === 'por_clases') {
      if (availablePackages.length > 0) {
        if (!selectedPaqueteId) {
          alert("Por favor selecciona un paquete de clases disponible.");
          return;
        }
        const pkg = availablePackages.find(p => String(p.id) === String(selectedPaqueteId));
        if (pkg) {
          paqueteId = String(pkg.id);
          clasesTotal = Number(pkg.clases);
        }
      } else {
        if (!clasesCompradas || parseInt(clasesCompradas) <= 0) {
          alert("Por favor ingresa la cantidad de clases.");
          return;
        }
        clasesTotal = parseInt(clasesCompradas);
      }
    }

    setLoading(true);
    try {
      await api.patch('/api/v1/students/me/membership', {
        tipo_membresia: selectedMembresia,
        gym_paquete_id: paqueteId,
        clases_compradas: clasesTotal
      });
      await queryClient.invalidateQueries({ queryKey: ['studentProfile'] });
      await queryClient.invalidateQueries({ queryKey: ['studentProfile', 'v2'] });
      if (onComplete) onComplete();
    } catch (error) {
      alert("Error al actualizar la membresía: " + (error.message || 'Error de servidor'));
    } finally {
      setLoading(false);
    }
  };

  const isPorClasesValid = selectedMembresia === 'por_clases' 
    ? (availablePackages.length > 0 ? Boolean(selectedPaqueteId) : Boolean(clasesCompradas && parseInt(clasesCompradas) > 0))
    : true;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 overflow-y-auto">
      <div className="glass-card w-full max-w-lg p-6 sm:p-8 flex flex-col gap-6 animate-fade-in border border-emerald-500/30 rounded-2xl bg-zinc-950 shadow-2xl my-auto">
        <div className="flex flex-col gap-2 text-center">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-emerald-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white">
            Configuración de Membresía
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Tu cuenta en <strong>{gymInfo?.nombre || 'el gimnasio'}</strong> requiere que selecciones tu modalidad de entrenamiento para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider block mb-2.5">
              1. Selecciona cómo vas a entrenar
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setSelectedMembresia('pase_libre'); setSelectedPaqueteId(''); }}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  selectedMembresia === 'pase_libre'
                    ? 'border-emerald-500 bg-emerald-500/15 shadow-lg shadow-emerald-500/10'
                    : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`font-bold text-sm ${selectedMembresia === 'pase_libre' ? 'text-emerald-400' : 'text-white'}`}>
                    Pase Libre
                  </span>
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMembresia === 'pase_libre' ? 'border-emerald-400 bg-emerald-400' : 'border-zinc-600'}`}>
                    {selectedMembresia === 'pase_libre' && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">Entrenamiento ilimitado durante el período mensual.</p>
                {gymInfo?.gym_monto_pase_libre && (
                  <span className="text-[11px] text-emerald-400/90 font-semibold mt-1">
                    ${Number(gymInfo.gym_monto_pase_libre).toLocaleString('es-AR')} / mes
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedMembresia('por_clases')}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  selectedMembresia === 'por_clases'
                    ? 'border-emerald-500 bg-emerald-500/15 shadow-lg shadow-emerald-500/10'
                    : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`font-bold text-sm ${selectedMembresia === 'por_clases' ? 'text-emerald-400' : 'text-white'}`}>
                    Por Clases
                  </span>
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMembresia === 'por_clases' ? 'border-emerald-400 bg-emerald-400' : 'border-zinc-600'}`}>
                    {selectedMembresia === 'por_clases' && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">Paquete de clases o sesiones para consumir por entrada.</p>
              </button>
            </div>
          </div>

          {selectedMembresia === 'por_clases' && (
            <div className="animate-fade-in flex flex-col gap-3 pt-3 border-t border-zinc-800/80">
              <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">
                2. Selecciona tu paquete de clases disponible
              </label>

              {loadingPackages ? (
                <div className="p-4 bg-zinc-900 rounded-xl text-center text-xs text-zinc-400 animate-pulse border border-zinc-800">
                  Cargando paquetes de clases disponibles...
                </div>
              ) : availablePackages.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                  {availablePackages.map((pkg) => {
                    const isSelected = String(selectedPaqueteId) === String(pkg.id);
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPaqueteId(String(pkg.id))}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/15 text-white shadow-sm shadow-emerald-500/20'
                            : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-emerald-400 bg-emerald-400' : 'border-zinc-600'}`}>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-white">
                              {pkg.clases} {Number(pkg.clases) === 1 ? 'Clase' : 'Clases'}
                            </p>
                          </div>
                        </div>
                        {pkg.precio !== undefined && pkg.precio !== null && (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-zinc-800/80 text-emerald-400 border border-zinc-700">
                            ${Number(pkg.precio).toLocaleString('es-AR')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    Cantidad de clases iniciales
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={clasesCompradas}
                    onChange={(e) => setClasesCompradas(e.target.value)}
                    placeholder="Ej: 8, 12, etc."
                    className="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedMembresia || !isPorClasesValid || loading}
            className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-wider text-sm py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 active:scale-[0.99]"
          >
            {loading ? 'Guardando configuración...' : 'Confirmar Membresía'}
          </button>
        </form>
      </div>
    </div>
  );
}
