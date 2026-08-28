from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# ==========================================
# ESQUEMAS DE USUARIO
# ==========================================

class UsuarioBase(BaseModel):
    email: EmailStr

class UsuarioCreate(UsuarioBase):
    password: str = Field(..., min_length=6, description="Contraseña de al menos 6 caracteres")
    rol: str = Field(..., pattern="^(entrenador|alumno)$", description="El rol debe ser 'entrenador' o 'alumno'")

class UsuarioOut(UsuarioBase):
    id_usuario: UUID
    rol: str
    fecha_creacion: datetime
    telefono: Optional[str] = None

    class Config:
        from_attributes = True


# ==========================================
# ESQUEMAS DE AUTENTICACIÓN / TOKENS
# ==========================================

class Token(BaseModel):
    access_token: str
    token_type: str
    email: str
    rol: str
    id_usuario: UUID

class TokenData(BaseModel):
    email: Optional[str] = None


# ==========================================
# ESQUEMAS DE ENTRENADOR
# ==========================================

class EntrenadorBase(BaseModel):
    nombre: Optional[str] = None
    especialidad: Optional[str] = None
    biografia: Optional[str] = None
    anios_experiencia: Optional[int] = None
    url_foto_perfil: Optional[str] = None
    limite_alumnos: Optional[int] = 10
    fecha_vencimiento: Optional[datetime] = None
    estado_financiero: Optional[str] = "activo"
    tipo_cobro_alumnos: Optional[str] = None
    precio_cobro_alumnos: Optional[float] = None
    config_estado_alumno_default: Optional[str] = "activo"
    config_vencimiento_tipo: Optional[str] = "individual"
    config_vencimiento_dia: Optional[int] = None
    config_bloqueo_morosos: Optional[str] = "nunca"
    config_bloqueo_dias: Optional[int] = 0

class EntrenadorUpdate(EntrenadorBase):
    pass

class EntrenadorOut(EntrenadorBase):
    id_usuario: UUID
    usuario: UsuarioOut

    class Config:
        from_attributes = True


# ==========================================
# ESQUEMAS DE INVITACIÓN
# ==========================================

class InvitacionCreate(BaseModel):
    email_destinatario: Optional[EmailStr] = None

class InvitacionOut(BaseModel):
    id_invitacion: UUID
    id_entrenador: UUID
    codigo_unico: UUID
    email_destinatario: Optional[str] = None
    is_used: bool
    fecha_creacion: datetime
    fecha_expiracion: datetime

    class Config:
        from_attributes = True


# ==========================================
# ESQUEMAS DE ALUMNO
# ==========================================

class AlumnoBase(BaseModel):
    peso_corporal_actual: Optional[float] = None
    objetivo: Optional[str] = None
    id_rutina_activa: Optional[UUID] = None
    clasificacion: Optional[str] = None

class AlumnoCreate(AlumnoBase):
    email: EmailStr
    password: str = Field(..., min_length=6)
    codigo_invitacion: str = Field(..., description="UUIDv4 de invitación o Email del Entrenador")
    telefono: str = Field(..., description="WhatsApp con código de país")

class AlumnoUpdate(BaseModel):
    peso: Optional[float] = None
    altura: Optional[float] = None # Deprecated?
    objetivo: Optional[str] = None
    estado_activo: Optional[bool] = None
    clasificacion: Optional[str] = None

class AlumnoOut(AlumnoBase):    
    id_usuario: UUID
    id_entrenador: UUID
    estado_activo: bool
    fecha_ultimo_peso: Optional[datetime] = None
    fecha_vencimiento_pago: Optional[datetime] = None
    usuario: UsuarioOut
    entrenador: Optional[EntrenadorOut] = None
    rutina_nombre: Optional[str] = None

    class Config:
        from_attributes = True

class UpdatePaymentDate(BaseModel):
    dia_vencimiento_personalizado: Optional[int] = None


# ==========================================
# ESQUEMAS DE EJERCICIO
# ==========================================

class EjercicioBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    categoria: Optional[str] = "General"
    url_media: Optional[str] = None
    url_gif: Optional[str] = None
    es_con_peso: Optional[bool] = True
    tipo_banda: Optional[str] = None
    has_custom_media: Optional[bool] = False

class EjercicioCreate(EjercicioBase):
    pass

class EjercicioUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    url_media: Optional[str] = None
    url_gif: Optional[str] = None
    es_con_peso: Optional[bool] = None
    tipo_banda: Optional[str] = None

class EjercicioOut(EjercicioBase):
    id_ejercicio: UUID
    id_entrenador: Optional[UUID] = None

    class Config:
        from_attributes = True

# ==========================================
# ESQUEMAS DE RUTINAS
# ==========================================

class RutinaEjercicioCreate(BaseModel):
    id_ejercicio: UUID
    series_esperadas: int
    reps_esperadas: int
    descanso_segundos: Optional[int] = None
    orden: int
    nota_entrenador: Optional[str] = None

class RutinaDiaCreate(BaseModel):
    nombre_dia: str
    orden: int
    ejercicios: List[RutinaEjercicioCreate]

class RutinaCreate(BaseModel):
    nombre_rutina: str
    frecuencia_semanal: int = 3
    dias: List[RutinaDiaCreate]

class RutinaEjercicioOut(BaseModel):
    id_rutina_ejercicio: UUID
    id_ejercicio: UUID
    series_esperadas: int
    reps_esperadas: int
    descanso_segundos: Optional[int] = None
    orden: int
    nota_entrenador: Optional[str] = None
    ejercicio: Optional[EjercicioOut] = None

    class Config:
        from_attributes = True

class RutinaDiaOut(BaseModel):
    id_dia: UUID
    nombre_dia: str
    orden: int
    ejercicios: List[RutinaEjercicioOut] = []

    class Config:
        from_attributes = True

class RutinaOut(BaseModel):
    id_rutina: UUID
    nombre_rutina: str
    version_id: int
    is_active: bool
    fecha_creacion: datetime
    frecuencia_semanal: Optional[int] = 3
    dias: List[RutinaDiaOut] = []

    class Config:
        from_attributes = True

# ==========================================
# ESQUEMAS DE ASIGNACIÓN
# ==========================================

class AsignacionCreate(BaseModel):
    id_alumno: UUID

class AsignacionBulkCreate(BaseModel):
    id_alumnos: List[UUID]

# ==========================================
# ESQUEMAS DE SESIONES Y ENTRENAMIENTO OFFLINE
# ==========================================

class EntrenamientoSetRealCreate(BaseModel):
    id_rutina_ejercicio: UUID
    peso_usado: float
    reps_logradas: int
    rpe: Optional[int] = None

class EntrenamientoSesionStart(BaseModel):
    id_rutina: UUID

class EntrenamientoSesionStartOut(BaseModel):
    id_sesion: UUID
    id_rutina: UUID
    estado: str

class EntrenamientoSesionComplete(BaseModel):
    fecha_fin: datetime
    sets: List[EntrenamientoSetRealCreate]

class EntrenamientoSetRealOut(BaseModel):
    id_set: UUID
    id_rutina_ejercicio: UUID
    peso_usado: float
    reps_logradas: int
    rpe: Optional[int] = None
    rutina_ejercicio: Optional[RutinaEjercicioOut] = None

    class Config:
        from_attributes = True

class EntrenamientoSesionOut(BaseModel):
    id_sesion: UUID
    id_alumno: UUID
    id_rutina: UUID
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    estado: str
    nombre_dia: Optional[str] = None
    sets: List[EntrenamientoSetRealOut] = []
    nuevos_prs: List[str] = []

    class Config:
        from_attributes = True

class StudentStatsOut(BaseModel):
    total_sessions: int
    total_volume_kg: float
    total_reps: int
    win_rate_percentage: float
    rolling_adherence: float
    rep_maxes: dict

class LogLigaAlumnoOut(BaseModel):
    id_log: UUID
    id_alumno: UUID
    alumno_nombre: str
    ejercicio_nombre: str
    nivel_alcanzado: str
    subnivel_alcanzado: int
    fecha_logro: datetime
    e1rm_logrado: float

    class Config:
        from_attributes = True

class AuditResolveRequest(BaseModel):
    action: str # "aprobar" o "rechazar"

class LeagueStatusOut(BaseModel):
    ejercicio_nombre: str
    e1rm_actual: float
    multiplicador_actual: float
    nivel_actual: str
    subnivel_actual: int
    peso_faltante_proximo_nivel: float
    proximo_nivel: Optional[str] = None
    proximo_subnivel: Optional[int] = None
    is_pending_audit: bool

    class Config:
        from_attributes = True

# ==========================================
# ESQUEMAS SUPERADMIN
# ==========================================

class CoachAdminOut(BaseModel):
    id_usuario: UUID
    nombre: Optional[str] = None
    email: str
    limite_alumnos: int
    estado_financiero: str
    estado_activo: bool
    modelo_pago: str
    monto_fijo: Optional[float] = None
    fecha_vencimiento: Optional[datetime] = None
    en_periodo_prueba: bool = False
    fecha_fin_prueba: Optional[datetime] = None
    total_alumnos: int
    deuda_estimada_mes: float = 0.0
    pago_mes_registrado: bool = False

class CoachAdminUpdate(BaseModel):
    limite_alumnos: Optional[int] = None
    estado_financiero: Optional[str] = None
    estado_activo: Optional[bool] = None
    modelo_pago: Optional[str] = None
    monto_fijo: Optional[float] = None
    fecha_vencimiento: Optional[datetime] = None
    en_periodo_prueba: Optional[bool] = None
    fecha_fin_prueba: Optional[datetime] = None

class PagoEntrenadorCreate(BaseModel):
    monto: float
    metodo_pago: Optional[str] = None
    notas: Optional[str] = None

class PagoEntrenadorOut(BaseModel):
    id_pago: UUID
    id_entrenador: UUID
    anio_mes: str
    fecha_pago: datetime
    monto: float
    metodo_pago: Optional[str] = None
    notas: Optional[str] = None

    class Config:
        from_attributes = True

# ==========================================
# ESQUEMAS ALUMNOS
# ==========================================

class PhoneUpdate(BaseModel):
    telefono: str

# ==========================================
# ESQUEMAS PAGOS Y ESTADO DE ALUMNO
# ==========================================

class PagoAlumnoCreate(BaseModel):
    id_alumno: UUID
    anio_mes: str
    monto: Optional[float] = None
    metodo_pago: Optional[str] = None
    notas: Optional[str] = None

class PagoAlumnoOut(BaseModel):
    id_pago: UUID
    id_alumno: UUID
    id_entrenador: UUID
    anio_mes: str
    fecha_pago: datetime
    monto: Optional[float] = None
    metodo_pago: Optional[str] = None
    notas: Optional[str] = None

    class Config:
        from_attributes = True

class EstadoPagoAlumnoResponse(BaseModel):
    id_alumno: UUID
    nombre_alumno: str
    email_alumno: str
    telefono_alumno: Optional[str] = None
    estado_activo: bool
    pagado: bool
    pago: Optional[PagoAlumnoOut] = None
    fecha_vencimiento_pago: Optional[datetime] = None
    dias_para_vencer: Optional[int] = None
    bloqueado_por_pago: Optional[bool] = False

class CoachFinanceSummary(BaseModel):
    ingreso_real_mes: float
    ingreso_esperado_mes: Optional[float] = None
    deuda_pendiente: Optional[float] = None
    alumnos_pagados: int
    alumnos_pendientes: int
    cant_alumnos: int
    historial: list # List of dicts {mes: str, ingresos: float}

class SuspensionUpdate(BaseModel):
    estado_activo: bool
    dia_vencimiento_personalizado: Optional[int] = None






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
