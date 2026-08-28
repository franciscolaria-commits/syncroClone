import React, { useState, useEffect } from 'react';
import { Camera, Activity, FileText, Upload, Plus, Trash2, CheckCircle2, X } from 'lucide-react';
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
  const [selectedRecord, setSelectedRecord] = useState(null);

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
      if (activeTab === 'fisico') setPhysicalEvals(res);
      if (activeTab === 'cuerpo') setBodyComps(res);
      if (activeTab === 'fotos') setVisuals(res);
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
        const uploadData = new FormData();
        uploadData.append('file', file);
        
        const uploadRes = await api.post("/api/v1/storage/upload", uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        setFormData({ ...formData, [field]: uploadRes.public_url });
      } catch (err) {
        console.error(err); alert("Error al subir imagen");
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

      
      let payload = { ...formData };
      if (activeTab === 'fotos' && userRole === 'entrenador') {
        payload.visible_para_entrenador = true;
      }
      await api.post(`/api/v1/students/${studentId}/evaluations/${endpoint}`, payload);

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

          {userRole !== 'entrenador' && (
          <label className="mt-4 flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" name="visible_para_entrenador" onChange={handleCheckbox} className="rounded bg-zinc-800 text-emerald-500" />
            Permitir que mi entrenador vea estas fotos
          </label>
          )}

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
                <tr key={ev.id_evaluacion} className="hover:bg-zinc-900 border-b border-zinc-800 cursor-pointer" onClick={() => setSelectedRecord({type: 'fisico', data: ev})}>
                  <td className="p-2">{new Date(ev.fecha).toLocaleDateString()}</td>
                  <td className="p-2">{ev.rm_sentadilla||'-'} / {ev.rm_banco||'-'} / {ev.rm_peso_muerto||'-'}</td>
                  <td className="p-2">{ev.sj_cm||'-'} / {ev.cmj_cm||'-'}</td>
                  <td className="p-2">{ev.push_ups_45s||'-'} / {ev.sit_ups_45s||'-'}</td>
                  <td className="p-2">{ev.cooper_m||'-'}m</td>
                  <td className="p-2">{ev.dominadas_reps||'-'}</td>
                  <td className="p-2"><button onClick={(e) => { e.stopPropagation(); deleteItem(ev.id_evaluacion); }}><Trash2 size={14} className="text-red-500"/></button></td>
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
                <tr key={ev.id_composicion} className="hover:bg-zinc-900 border-b border-zinc-800 cursor-pointer" onClick={() => setSelectedRecord({type: 'cuerpo', data: ev})}>
                  <td className="p-2">{new Date(ev.fecha).toLocaleDateString()}</td>
                  <td className="p-2">{ev.peso||'-'} kg</td>
                  <td className="p-2">{ev.porcentaje_grasa||'-'}%</td>
                  <td className="p-2">{ev.porcentaje_musculo||'-'}%</td>
                  <td className="p-2">{ev.perimetro_cintura||'-'} cm</td>
                  <td className="p-2"><button onClick={(e) => { e.stopPropagation(); deleteItem(ev.id_composicion); }}><Trash2 size={14} className="text-red-500"/></button></td>
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

    
      {/* MODAL DE DETALLES */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setSelectedRecord(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-white"><X size={24} /></button>
            <h3 className="font-bold text-xl text-emerald-400 mb-4 uppercase tracking-wider border-b border-zinc-800 pb-2">
              {selectedRecord.type === 'fisico' ? 'Detalles Evaluación Física' : 'Detalles Composición Corporal'}
            </h3>
            
            <div className="text-sm text-zinc-300 mb-6">
              <span className="font-bold text-white">Fecha:</span> {new Date(selectedRecord.data.fecha).toLocaleDateString()}
            </div>

            {selectedRecord.type === 'fisico' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-bold text-zinc-500 mb-2">Fuerza 1RM</h4>
                  <ul className="space-y-1">
                    <li><span className="text-zinc-400">Sentadilla:</span> {selectedRecord.data.rm_sentadilla || '-'} kg</li>
                    <li><span className="text-zinc-400">Banco:</span> {selectedRecord.data.rm_banco || '-'} kg</li>
                    <li><span className="text-zinc-400">Peso Muerto:</span> {selectedRecord.data.rm_peso_muerto || '-'} kg</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-zinc-500 mb-2">Fuerza 3RM</h4>
                  <ul className="space-y-1">
                    <li><span className="text-zinc-400">Sentadilla:</span> {selectedRecord.data.rm3_sentadilla || '-'} kg</li>
                    <li><span className="text-zinc-400">Banco:</span> {selectedRecord.data.rm3_banco || '-'} kg</li>
                    <li><span className="text-zinc-400">Peso Muerto:</span> {selectedRecord.data.rm3_peso_muerto || '-'} kg</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-zinc-500 mb-2">Cargas</h4>
                  <ul className="space-y-1">
                    <li><span className="text-zinc-400">Peso en RIR3:</span> {selectedRecord.data.peso_rir3 || '-'} kg</li>
                    <li><span className="text-zinc-400">Peso en RIR5:</span> {selectedRecord.data.peso_rir5 || '-'} kg</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-zinc-500 mb-2">Saltos</h4>
                  <ul className="space-y-1">
                    <li><span className="text-zinc-400">SJ:</span> {selectedRecord.data.sj_cm || '-'} cm</li>
                    <li><span className="text-zinc-400">CMJ:</span> {selectedRecord.data.cmj_cm || '-'} cm</li>
                    <li><span className="text-zinc-400">Abalakov:</span> {selectedRecord.data.abalakov_cm || '-'} cm</li>
                    <li><span className="text-zinc-400">Potencia CMJ:</span> {selectedRecord.data.cmj_potencia_w || '-'} W</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-zinc-500 mb-2">Resistencia / Otros</h4>
                  <ul className="space-y-1">
                    <li><span className="text-zinc-400">Flexibilidad:</span> {selectedRecord.data.flexibilidad_cm || '-'} cm</li>
                    <li><span className="text-zinc-400">Push-ups 45s:</span> {selectedRecord.data.push_ups_45s || '-'}</li>
                    <li><span className="text-zinc-400">Sit-ups 45s:</span> {selectedRecord.data.sit_ups_45s || '-'}</li>
                    <li><span className="text-zinc-400">Test Cooper:</span> {selectedRecord.data.cooper_m || '-'} m</li>
                    <li><span className="text-zinc-400">Plancha:</span> {selectedRecord.data.plancha_s || '-'} s</li>
                    <li><span className="text-zinc-400">Dominadas:</span> {selectedRecord.data.dominadas_reps || '-'}</li>
                  </ul>
                </div>
              </div>
            )}

            {selectedRecord.type === 'cuerpo' && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-zinc-500 mb-2">Índices Generales</h4>
                  <ul className="space-y-1">
                    <li><span className="text-zinc-400">Peso:</span> {selectedRecord.data.peso || '-'} kg</li>
                    <li><span className="text-zinc-400">% Grasa:</span> {selectedRecord.data.porcentaje_grasa || '-'} %</li>
                    <li><span className="text-zinc-400">% Músculo:</span> {selectedRecord.data.porcentaje_musculo || '-'} %</li>
                    <li><span className="text-zinc-400">% Agua:</span> {selectedRecord.data.porcentaje_agua || '-'} %</li>
                    <li><span className="text-zinc-400">Masa Ósea:</span> {selectedRecord.data.masa_osea || '-'} kg</li>
                    <li><span className="text-zinc-400">BMI:</span> {selectedRecord.data.bmi || '-'}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-zinc-500 mb-2">Perímetros (cm)</h4>
                  <ul className="space-y-1">
                    <li><span className="text-zinc-400">Pecho:</span> {selectedRecord.data.perimetro_pecho || '-'}</li>
                    <li><span className="text-zinc-400">Cintura:</span> {selectedRecord.data.perimetro_cintura || '-'}</li>
                    <li><span className="text-zinc-400">Cadera:</span> {selectedRecord.data.perimetro_cadera || '-'}</li>
                    <li><span className="text-zinc-400">Brazo Izquierdo:</span> {selectedRecord.data.perimetro_brazo_i || '-'}</li>
                    <li><span className="text-zinc-400">Brazo Derecho:</span> {selectedRecord.data.perimetro_brazo_d || '-'}</li>
                    <li><span className="text-zinc-400">Pierna Izquierda:</span> {selectedRecord.data.perimetro_pierna_i || '-'}</li>
                    <li><span className="text-zinc-400">Pierna Derecha:</span> {selectedRecord.data.perimetro_pierna_d || '-'}</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="mt-8 pt-4 border-t border-zinc-800 text-right">
              <button onClick={() => setSelectedRecord(null)} className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded font-bold uppercase tracking-widest text-xs">Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentEvaluations;

