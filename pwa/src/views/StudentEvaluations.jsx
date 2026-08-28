import React, { useState, useEffect } from 'react';
import { Camera, Activity, FileText, Upload, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api.js';

const StudentEvaluations = ({ providedStudentId }) => {
  const [activeTab, setActiveTab] = useState('fisico');
  const [studentId, setStudentId] = useState(providedStudentId);
  const [userRole, setUserRole] = useState('alumno');
  
  // Data
  const [physicalEvals, setPhysicalEvals] = useState([]);
  const [bodyComps, setBodyComps] = useState([]);
  const [visuals, setVisuals] = useState([]);
  
  // Forms
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!providedStudentId) {
      const userRaw = localStorage.getItem('fitness_user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        setStudentId(u.id_usuario);
        setUserRole(u.rol);
      }
    } else {
      setUserRole('entrenador');
    }
  }, [providedStudentId]);

  useEffect(() => {
    if (studentId) {
      fetchData();
    }
  }, [studentId, activeTab]);

  const fetchData = async () => {
    try {
      let endpoint = '';
      if (activeTab === 'fisico') endpoint = 'physical';
      if (activeTab === 'cuerpo') endpoint = 'body';
      if (activeTab === 'fotos') endpoint = 'visual';
      
      const res = await api.get(`/api/v1/students/${studentId}/evaluations/${endpoint}`);
      if (activeTab === 'fisico') setPhysicalEvals(res.data);
      if (activeTab === 'cuerpo') setBodyComps(res.data);
      if (activeTab === 'fotos') setVisuals(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value });
  };

  const handleCheckbox = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.checked });
  };

  const handleUploadPhoto = async (e, field) => {
    if (e.target.files.length > 0) {
      setUploading(true);
      try {
        const file = e.target.files[0];
        const presignedRes = await api.post("/api/v1/storage/presigned", {
          filename: file.name,
          content_type: file.type
        });
        const uploadRes = await fetch(presignedRes.data.upload_url, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });
        if (!uploadRes.ok) throw new Error("Upload failed");
        setFormData({ ...formData, [field]: presignedRes.data.public_url });
      } catch (err) {
        alert("Error al subir imagen");
      }
      setUploading(false);
    }
  };

  const submitForm = async (e) => {
    e.preventDefault();
    try {
      let endpoint = '';
      if (activeTab === 'fisico') endpoint = 'physical';
      if (activeTab === 'cuerpo') endpoint = 'body';
      if (activeTab === 'fotos') endpoint = 'visual';

      await api.post(`/api/v1/students/${studentId}/evaluations/${endpoint}`, formData);
      setShowForm(false);
      setFormData({});
      fetchData();
    } catch (err) {
      alert("Error al guardar");
    }
  };

  const deleteItem = async (id) => {
    if(!window.confirm("¿Borrar registro?")) return;
    try {
      let endpoint = '';
      if (activeTab === 'fisico') endpoint = 'physical';
      if (activeTab === 'cuerpo') endpoint = 'body';
      if (activeTab === 'fotos') endpoint = 'visual';

      await api.delete(`/api/v1/evaluations/${endpoint}/${id}`);
      fetchData();
    } catch (err) {
      alert("Error al borrar");
    }
  };

  return (
    <div className="w-full text-white">
      <div className="flex gap-2 mb-6 border-b border-zinc-800 pb-2">
        <button onClick={() => {setActiveTab('fisico'); setShowForm(false);}} className={`px-4 py-2 rounded text-xs font-bold uppercase transition-colors ${activeTab === 'fisico' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}>Físico</button>
        <button onClick={() => {setActiveTab('cuerpo'); setShowForm(false);}} className={`px-4 py-2 rounded text-xs font-bold uppercase transition-colors ${activeTab === 'cuerpo' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}>Cuerpo</button>
        <button onClick={() => {setActiveTab('fotos'); setShowForm(false);}} className={`px-4 py-2 rounded text-xs font-bold uppercase transition-colors ${activeTab === 'fotos' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}>Fotos</button>
      </div>

      {!showForm && (
        <button onClick={() => setShowForm(true)} className="mb-4 bg-emerald-500 text-black px-4 py-2 rounded text-xs font-bold flex items-center gap-2">
          <Plus size={16} /> NUEVO REGISTRO
        </button>
      )}

      {/* FOMULARIOS */}
      {showForm && activeTab === 'fisico' && (
        <form onSubmit={submitForm} className="bg-zinc-900 border border-zinc-800 p-4 rounded mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <h3 className="col-span-full font-bold text-emerald-400 mb-2">Evaluación Física</h3>
          
          <label className="text-xs text-zinc-400">Sentadilla 1RM <input name="rm_sentadilla" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">Banco 1RM <input name="rm_banco" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">Peso Muerto 1RM <input name="rm_peso_muerto" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          
          <label className="text-xs text-zinc-400">Sentadilla 3RM <input name="rm3_sentadilla" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">Banco 3RM <input name="rm3_banco" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">Peso Muerto 3RM <input name="rm3_peso_muerto" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          
          <label className="text-xs text-zinc-400">Peso en RIR3 <input name="peso_rir3" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">Peso en RIR5 <input name="peso_rir5" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>

          <label className="text-xs text-zinc-400">SJ (cm) <input name="sj_cm" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">CMJ (cm) <input name="cmj_cm" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">Abalakov (cm) <input name="abalakov_cm" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">CMJ (W) <input name="cmj_potencia_w" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>

          <label className="text-xs text-zinc-400">Flexibilidad (cm) <input name="flexibilidad_cm" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">Push-ups 45s <input name="push_ups_45s" type="number" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">Sit-ups 45s <input name="sit_ups_45s" type="number" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          
          <label className="text-xs text-zinc-400">Cooper (m) <input name="cooper_m" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">Plancha (s) <input name="plancha_s" type="number" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">Dominadas <input name="dominadas_reps" type="number" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          
          <div className="col-span-full mt-2">
            <button type="submit" className="bg-emerald-500 text-black px-4 py-2 font-bold rounded">Guardar Evaluación</button>
            <button type="button" onClick={() => setShowForm(false)} className="ml-2 text-zinc-400">Cancelar</button>
          </div>
        </form>
      )}

      {showForm && activeTab === 'cuerpo' && (
        <form onSubmit={submitForm} className="bg-zinc-900 border border-zinc-800 p-4 rounded mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <h3 className="col-span-full font-bold text-emerald-400 mb-2">Composición Corporal</h3>
          <label className="text-xs text-zinc-400">Peso (kg) <input name="peso" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">% Grasa <input name="porcentaje_grasa" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">% Músculo <input name="porcentaje_musculo" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">% Agua <input name="porcentaje_agua" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          
          <label className="text-xs text-zinc-400">Masa Ósea <input name="masa_osea" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">BMI <input name="bmi" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          
          <h4 className="col-span-full font-bold text-emerald-400 mt-2 border-b border-zinc-700 pb-1">Perímetros (cm)</h4>
          <label className="text-xs text-zinc-400">Pecho <input name="perimetro_pecho" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">Cintura <input name="perimetro_cintura" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">Cadera <input name="perimetro_cadera" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">Brazo Izq <input name="perimetro_brazo_i" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">Brazo Der <input name="perimetro_brazo_d" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">Pierna Izq <input name="perimetro_pierna_i" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>
          <label className="text-xs text-zinc-400">Pierna Der <input name="perimetro_pierna_d" type="number" step="0.1" onChange={handleChange} className="w-full bg-zinc-800 p-2 mt-1 rounded text-white" /></label>

          <div className="col-span-full mt-2">
            <button type="submit" className="bg-emerald-500 text-black px-4 py-2 font-bold rounded">Guardar Bioimpedancia</button>
            <button type="button" onClick={() => setShowForm(false)} className="ml-2 text-zinc-400">Cancelar</button>
          </div>
        </form>
      )}

      {showForm && activeTab === 'fotos' && (
        <form onSubmit={submitForm} className="bg-zinc-900 border border-zinc-800 p-4 rounded mb-6">
          <h3 className="font-bold text-emerald-400 mb-4">Registro Visual (Opcional)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="border-2 border-dashed border-zinc-700 p-4 rounded text-center cursor-pointer hover:border-emerald-500 transition-colors">
              <Camera className="mx-auto mb-2 text-zinc-500" />
              <div className="text-xs text-zinc-400">{formData.url_frente ? 'Imagen cargada' : 'Subir Frente'}</div>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUploadPhoto(e, 'url_frente')} />
            </label>
            <label className="border-2 border-dashed border-zinc-700 p-4 rounded text-center cursor-pointer hover:border-emerald-500 transition-colors">
              <Camera className="mx-auto mb-2 text-zinc-500" />
              <div className="text-xs text-zinc-400">{formData.url_perfil ? 'Imagen cargada' : 'Subir Perfil'}</div>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUploadPhoto(e, 'url_perfil')} />
            </label>
            <label className="border-2 border-dashed border-zinc-700 p-4 rounded text-center cursor-pointer hover:border-emerald-500 transition-colors">
              <Camera className="mx-auto mb-2 text-zinc-500" />
              <div className="text-xs text-zinc-400">{formData.url_espalda ? 'Imagen cargada' : 'Subir Espalda'}</div>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUploadPhoto(e, 'url_espalda')} />
            </label>
          </div>

          <label className="mt-4 flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" name="visible_para_entrenador" onChange={handleCheckbox} className="rounded bg-zinc-800 text-emerald-500" />
            Permitir que mi entrenador vea estas fotos
          </label>

          <div className="mt-4">
            <button type="submit" disabled={uploading} className="bg-emerald-500 text-black px-4 py-2 font-bold rounded">
              {uploading ? 'Subiendo imagen...' : 'Guardar Fotos'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="ml-2 text-zinc-400">Cancelar</button>
          </div>
        </form>
      )}

      {/* HISTORIAL */}
      {!showForm && activeTab === 'fisico' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-800">
                <th className="p-2 border-b border-zinc-700">Fecha</th>
                <th className="p-2 border-b border-zinc-700">1RM SQ/BP/DL</th>
                <th className="p-2 border-b border-zinc-700">Saltos (SJ/CMJ)</th>
                <th className="p-2 border-b border-zinc-700">Push/Sit-ups</th>
                <th className="p-2 border-b border-zinc-700">Cooper</th>
                <th className="p-2 border-b border-zinc-700">Dom.</th>
                <th className="p-2 border-b border-zinc-700">Acción</th>
              </tr>
            </thead>
            <tbody>
              {physicalEvals.map(ev => (
                <tr key={ev.id_evaluacion} className="hover:bg-zinc-900 border-b border-zinc-800">
                  <td className="p-2">{new Date(ev.fecha).toLocaleDateString()}</td>
                  <td className="p-2">{ev.rm_sentadilla||'-'} / {ev.rm_banco||'-'} / {ev.rm_peso_muerto||'-'}</td>
                  <td className="p-2">{ev.sj_cm||'-'} / {ev.cmj_cm||'-'}</td>
                  <td className="p-2">{ev.push_ups_45s||'-'} / {ev.sit_ups_45s||'-'}</td>
                  <td className="p-2">{ev.cooper_m||'-'}m</td>
                  <td className="p-2">{ev.dominadas_reps||'-'}</td>
                  <td className="p-2"><button onClick={() => deleteItem(ev.id_evaluacion)}><Trash2 size={14} className="text-red-500"/></button></td>
                </tr>
              ))}
              {physicalEvals.length === 0 && <tr><td colSpan="7" className="p-4 text-center text-zinc-500">Sin registros físicos</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {!showForm && activeTab === 'cuerpo' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-800">
                <th className="p-2 border-b border-zinc-700">Fecha</th>
                <th className="p-2 border-b border-zinc-700">Peso</th>
                <th className="p-2 border-b border-zinc-700">% Grasa</th>
                <th className="p-2 border-b border-zinc-700">% Músculo</th>
                <th className="p-2 border-b border-zinc-700">Cintura</th>
                <th className="p-2 border-b border-zinc-700">Acción</th>
              </tr>
            </thead>
            <tbody>
              {bodyComps.map(ev => (
                <tr key={ev.id_composicion} className="hover:bg-zinc-900 border-b border-zinc-800">
                  <td className="p-2">{new Date(ev.fecha).toLocaleDateString()}</td>
                  <td className="p-2">{ev.peso||'-'} kg</td>
                  <td className="p-2">{ev.porcentaje_grasa||'-'}%</td>
                  <td className="p-2">{ev.porcentaje_musculo||'-'}%</td>
                  <td className="p-2">{ev.perimetro_cintura||'-'} cm</td>
                  <td className="p-2"><button onClick={() => deleteItem(ev.id_composicion)}><Trash2 size={14} className="text-red-500"/></button></td>
                </tr>
              ))}
              {bodyComps.length === 0 && <tr><td colSpan="6" className="p-4 text-center text-zinc-500">Sin registros de bioimpedancia</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {!showForm && activeTab === 'fotos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visuals.map(ev => (
            <div key={ev.id_progreso} className="bg-zinc-900 border border-zinc-800 rounded p-4 relative">
              <button onClick={() => deleteItem(ev.id_progreso)} className="absolute top-2 right-2 p-1 bg-black/50 rounded hover:bg-red-500"><Trash2 size={14} className="text-white"/></button>
              <h4 className="font-bold text-zinc-400 mb-2">{new Date(ev.fecha).toLocaleDateString()}</h4>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {ev.url_frente && <img src={ev.url_frente} className="w-24 h-32 object-cover rounded" alt="Frente" />}
                {ev.url_perfil && <img src={ev.url_perfil} className="w-24 h-32 object-cover rounded" alt="Perfil" />}
                {ev.url_espalda && <img src={ev.url_espalda} className="w-24 h-32 object-cover rounded" alt="Espalda" />}
              </div>
              <div className="text-[10px] text-zinc-500 mt-2">
                {ev.visible_para_entrenador ? 'Visible para entrenador' : 'Privado'}
              </div>
            </div>
          ))}
          {visuals.length === 0 && <div className="col-span-full p-4 text-center text-zinc-500 border border-dashed border-zinc-800 rounded">Sin fotos de progreso</div>}
        </div>
      )}

    </div>
  );
};

export default StudentEvaluations;

