from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class EvaluacionFisicaBase(BaseModel):
    fecha: Optional[datetime] = None
    cuadriceps_d: Optional[float] = None
    cuadriceps_i: Optional[float] = None
    isquios_d: Optional[float] = None
    isquios_i: Optional[float] = None
    sj_cm: Optional[float] = None
    cmj_cm: Optional[float] = None
    abalakov_cm: Optional[float] = None
    cmj_potencia_w: Optional[float] = None
    flexibilidad_cm: Optional[float] = None
    push_ups_45s: Optional[int] = None
    sit_ups_45s: Optional[int] = None
    rm_sentadilla: Optional[float] = None
    rm_banco: Optional[float] = None
    rm_peso_muerto: Optional[float] = None
    rm3_sentadilla: Optional[float] = None
    rm3_banco: Optional[float] = None
    rm3_peso_muerto: Optional[float] = None
    peso_rir3: Optional[float] = None
    peso_rir5: Optional[float] = None
    cooper_m: Optional[float] = None
    plancha_s: Optional[int] = None
    dominadas_reps: Optional[int] = None
    observaciones: Optional[str] = None

class EvaluacionFisicaCreate(EvaluacionFisicaBase):
    pass

class EvaluacionFisicaOut(EvaluacionFisicaBase):
    id_evaluacion: UUID
    id_alumno: UUID
    fecha: datetime

    class Config:
        from_attributes = True

class ComposicionCorporalBase(BaseModel):
    fecha: Optional[datetime] = None
    peso: Optional[float] = None
    porcentaje_grasa: Optional[float] = None
    porcentaje_musculo: Optional[float] = None
    porcentaje_agua: Optional[float] = None
    masa_osea: Optional[float] = None
    bmi: Optional[float] = None
    perimetro_pecho: Optional[float] = None
    perimetro_cintura: Optional[float] = None
    perimetro_cadera: Optional[float] = None
    perimetro_brazo_d: Optional[float] = None
    perimetro_brazo_i: Optional[float] = None
    perimetro_pierna_d: Optional[float] = None
    perimetro_pierna_i: Optional[float] = None
    observaciones: Optional[str] = None

class ComposicionCorporalCreate(ComposicionCorporalBase):
    pass

class ComposicionCorporalOut(ComposicionCorporalBase):
    id_composicion: UUID
    id_alumno: UUID
    fecha: datetime

    class Config:
        from_attributes = True

class ProgresoVisualBase(BaseModel):
    fecha: Optional[datetime] = None
    url_frente: Optional[str] = None
    url_perfil: Optional[str] = None
    url_espalda: Optional[str] = None
    visible_para_entrenador: Optional[bool] = False
    observaciones: Optional[str] = None

class ProgresoVisualCreate(ProgresoVisualBase):
    pass

class ProgresoVisualOut(ProgresoVisualBase):
    id_progreso: UUID
    id_alumno: UUID
    fecha: datetime

    class Config:
        from_attributes = True

class ConfiguracionEvaluacionUpdate(BaseModel):
    frecuencia_evaluacion_dias: Optional[int] = None
