import os
from pathlib import Path
from email.message import EmailMessage
import aiosmtplib
from dotenv import load_dotenv

# Asegurar carga de variables de entorno desde api/.env o root .env
base_dir = Path(__file__).resolve().parent.parent.parent
for env_candidate in [base_dir / ".env", base_dir.parent / ".env"]:
    if env_candidate.exists():
        load_dotenv(dotenv_path=env_candidate)

def get_smtp_credentials():
    """
    Recupera credenciales SMTP exclusivamente desde variables de entorno.
    Limpia comillas accidentales en variables de entorno.
    """
    raw_email = os.getenv("SMTP_EMAIL", "")
    raw_pass = os.getenv("SMTP_PASSWORD", "")
    smtp_email = raw_email.strip().strip('"').strip("'")
    smtp_pass = raw_pass.strip().strip('"').strip("'")
    return smtp_email, smtp_pass

async def _send_smtp_robust(message: EmailMessage, recipient: str) -> bool:
    """
    Envío SMTP de alta resiliencia para entornos cloud:
    Intenta Puerto 465 (SSL directo) y si falla o hay timeout en la nube,
    reintenta automáticamente por Puerto 587 (STARTTLS).
    """
    smtp_email, smtp_password = get_smtp_credentials()
    if not smtp_email or not smtp_password:
        print(f"[EmailService] Error: Credenciales SMTP no configuradas. No se puede enviar a {recipient}.")
        return False

    # Intento 1: Puerto 465 SSL directo
    try:
        await aiosmtplib.send(
            message,
            hostname="smtp.gmail.com",
            port=465,
            use_tls=True,
            username=smtp_email,
            password=smtp_password,
            timeout=15,
        )
        print(f"[EmailService] Correo enviado exitosamente a {recipient} via puerto 465 (SSL)")
        return True
    except Exception as e1:
        print(f"[EmailService] Puerto 465 SSL no disponible para {recipient}: {e1}. Reintentando con puerto 587 (STARTTLS)...")

    # Intento 2: Puerto 587 STARTTLS
    try:
        await aiosmtplib.send(
            message,
            hostname="smtp.gmail.com",
            port=587,
            start_tls=True,
            username=smtp_email,
            password=smtp_password,
            timeout=15,
        )
        print(f"[EmailService] Correo enviado exitosamente a {recipient} via puerto 587 (STARTTLS)")
        return True
    except Exception as e2:
        print(f"[EmailService] CRÍTICO: Fallaron ambos puertos 465 y 587 para {recipient}: {e2}")
        return False

async def send_payment_reminder_email(alumno_email: str, alumno_nombre: str, entrenador_nombre: str, is_due_today: bool):
    """
    Envía un correo de recordatorio de pago.
    is_due_today = True -> El pago vence hoy.
    is_due_today = False -> El pago vence en 2 días.
    """
    smtp_email, _ = get_smtp_credentials()
    if not smtp_email:
        print("Error: SMTP credentials not set. Cannot send email.")
        return

    subject = f"Recordatorio de pago - {entrenador_nombre}" if not is_due_today else f"Tu pago vence HOY - {entrenador_nombre}"
    
    if is_due_today:
        title = "Tu pago vence hoy"
        message_body = f"Hola <b>{alumno_nombre}</b>,<br><br>Te recordamos que hoy es tu fecha límite de pago para seguir entrenando con <b>{entrenador_nombre}</b>.<br>Por favor, comunicate con tu entrenador para registrar tu pago y evitar que tu acceso sea suspendido.<br><br>¡Que tengas un excelente día de entrenamiento!"
    else:
        title = "Próximo vencimiento de pago"
        message_body = f"Hola <b>{alumno_nombre}</b>,<br><br>Te enviamos este correo para avisarte que en <b>2 días</b> se vence tu mes de entrenamiento con <b>{entrenador_nombre}</b>.<br>Asegurate de regularizarlo a tiempo para mantener tu acceso sin interrupciones.<br><br>¡Que tengas un excelente día de entrenamiento!"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                background-color: #09090b;
                color: #e4e4e7;
                margin: 0;
                padding: 40px 20px;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: #18181b;
                border: 1px solid #27272a;
                border-radius: 16px;
                padding: 40px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            }}
            .logo {{
                font-size: 28px;
                font-weight: 900;
                color: #34d399;
                text-align: center;
                margin-bottom: 30px;
                letter-spacing: -1px;
            }}
            .title {{
                font-size: 20px;
                font-weight: bold;
                color: #f4f4f5;
                margin-bottom: 20px;
                text-align: center;
            }}
            .content {{
                font-size: 15px;
                line-height: 1.6;
                color: #a1a1aa;
            }}
            .content b {{
                color: #e4e4e7;
            }}
            .footer {{
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #27272a;
                text-align: center;
                font-size: 12px;
                color: #71717a;
            }}
            .badge {{
                display: inline-block;
                background-color: #059669;
                color: white;
                padding: 6px 16px;
                border-radius: 99px;
                font-size: 13px;
                font-weight: bold;
                margin-top: 20px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">SYNCRO</div>
            <div class="title">{title}</div>
            <div class="content">
                {message_body}
            </div>
            <div style="text-align: center;">
                <div class="badge">Aviso Automático</div>
            </div>
            <div class="footer">
                Este es un correo generado automáticamente. Por favor no respondas a esta dirección.<br>
                Syncro Fitness Platform &copy; 2026
            </div>
        </div>
    </body>
    </html>
    """

    smtp_email, _ = get_smtp_credentials()
    message = EmailMessage()
    message["From"] = f"Syncro Notificaciones <{smtp_email}>"
    message["To"] = alumno_email
    message["Subject"] = subject
    message.set_content("Por favor habilita HTML para ver este correo.")
    message.add_alternative(html_content, subtype="html")

    await _send_smtp_robust(message, alumno_email)


async def send_parental_consent_request_email(tutor_email: str, alumno_nombre: str, entrenador_nombre: str, token: str):
    """
    Despacha plantilla HTML responsiva con los fines del tratamiento (planificación deportiva,
    cargas de peso, métricas y asistencia), personas con acceso autorizado, canales de revocación
    y botón con enlace seguro.
    """
    smtp_email, _ = get_smtp_credentials()
    if not smtp_email:
        print("Error: SMTP credentials not set. Cannot send parental consent email.")
        return

    frontend_url = os.getenv("FRONTEND_URL", "https://syncro-clone.vercel.app").rstrip("/")
    auth_url = f"{frontend_url}/consentimiento-tutor?token={token}"
    subject = f"Autorización Parental Requerida para {alumno_nombre} - Syncro Platform"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #09090b;
                color: #e4e4e7;
                margin: 0;
                padding: 30px 15px;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: #18181b;
                border: 1px solid #27272a;
                border-radius: 18px;
                padding: 35px 30px;
                box-shadow: 0 15px 35px rgba(0,0,0,0.6);
            }}
            .logo {{
                font-size: 26px;
                font-weight: 900;
                color: #10b981;
                text-align: center;
                letter-spacing: -0.5px;
                margin-bottom: 8px;
            }}
            .badge-header {{
                text-align: center;
                margin-bottom: 25px;
            }}
            .badge {{
                display: inline-block;
                background-color: rgba(16, 185, 129, 0.15);
                color: #34d399;
                border: 1px solid rgba(16, 185, 129, 0.3);
                padding: 4px 14px;
                border-radius: 9999px;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.5px;
                text-transform: uppercase;
            }}
            .title {{
                font-size: 21px;
                font-weight: 800;
                color: #ffffff;
                margin-bottom: 15px;
                text-align: center;
                line-height: 1.3;
            }}
            .lead {{
                font-size: 15px;
                line-height: 1.6;
                color: #d4d4d8;
                margin-bottom: 25px;
            }}
            .card {{
                background-color: #27272a;
                border: 1px solid #3f3f46;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 25px;
            }}
            .card-title {{
                font-size: 13px;
                font-weight: 700;
                color: #34d399;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 12px;
            }}
            .item {{
                display: flex;
                margin-bottom: 10px;
                font-size: 14px;
                line-height: 1.5;
                color: #a1a1aa;
            }}
            .item b {{
                color: #f4f4f5;
            }}
            .cta-container {{
                text-align: center;
                margin: 35px 0 25px 0;
            }}
            .btn {{
                display: inline-block;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: #ffffff !important;
                text-decoration: none;
                font-weight: 800;
                font-size: 15px;
                padding: 16px 36px;
                border-radius: 12px;
                box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);
            }}
            .link-fallback {{
                font-size: 12px;
                color: #71717a;
                word-break: break-all;
                text-align: center;
                margin-top: 15px;
            }}
            .link-fallback a {{
                color: #34d399;
                text-decoration: none;
            }}
            .legal-notice {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #27272a;
                font-size: 12px;
                line-height: 1.6;
                color: #71717a;
            }}
            .footer {{
                text-align: center;
                font-size: 11px;
                color: #52525b;
                margin-top: 25px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">SYNCRO</div>
            <div class="badge-header">
                <span class="badge">Protección Legal de Menores</span>
            </div>
            
            <div class="title">Autorización Parental Requerida</div>
            
            <p class="lead">
                Estimado/a Padre, Madre o Tutor Legal,<br><br>
                El/la menor <b>{alumno_nombre}</b> ha solicitado el alta en la plataforma deportiva <b>Syncro</b> para llevar adelante su preparación física bajo la tutela del entrenador/a o box <b>{entrenador_nombre}</b>.
            </p>

            <div class="card">
                <div class="card-title">Fines del Tratamiento de Datos</div>
                <div class="item">🏋️ &nbsp;<b>Planificación deportiva:</b> Diseño y asignación de rutinas de fuerza y acondicionamiento.</div>
                <div class="item">📊 &nbsp;<b>Cargas y marcas:</b> Registro de peso corporal, repeticiones y evolución de rendimiento.</div>
                <div class="item">📅 &nbsp;<b>Asistencia:</b> Control de presencia y seguridad en sesiones presenciales.</div>
            </div>

            <div class="card">
                <div class="card-title">Privacidad y Seguridad Garantizada</div>
                <div class="item">🔒 &nbsp;<b>Acceso restringido:</b> Únicamente el alumno y su entrenador acreditado ({entrenador_nombre}) acceden a las métricas deportivas.</div>
                <div class="item">🛡️ &nbsp;<b>Minimización de datos:</b> Conforme a nuestros estándares, <b>no solicitamos DNI</b> ni del alumno ni del tutor legal.</div>
                <div class="item">✉️ &nbsp;<b>Canal de revocación:</b> Puede revocar este consentimiento o solicitar la eliminación total de datos en cualquier momento escribiendo a <a href="mailto:soporte@syncro.app" style="color: #34d399;">soporte@syncro.app</a>.</div>
            </div>

            <div class="cta-container">
                <a href="{auth_url}" class="btn" target="_blank">Revisar y Autorizar Consentimiento</a>
                <div class="link-fallback">
                    ¿El botón no responde? Copie y pegue este enlace en su navegador:<br>
                    <a href="{auth_url}">{auth_url}</a>
                </div>
            </div>

            <div class="legal-notice">
                <b>Validez de la solicitud:</b> Este enlace es estrictamente personal y expira automáticamente en 30 días. La cuenta del menor permanecerá en estado preventivo inactivo hasta que se complete la autorización.
            </div>

            <div class="footer">
                Syncro Fitness Platform &copy; 2026 • Arquitectura y Cumplimiento Normativo
            </div>
        </div>
    </body>
    </html>
    """

    smtp_email, _ = get_smtp_credentials()
    message = EmailMessage()
    message["From"] = f"Syncro Privacidad <{smtp_email}>"
    message["Reply-To"] = "soporte@syncro.app"
    message["To"] = tutor_email
    message["Subject"] = subject
    message.set_content(f"Autorización parental requerida para {alumno_nombre}. Ingrese a {auth_url} para autorizar.")
    message.add_alternative(html_content, subtype="html")

    await _send_smtp_robust(message, tutor_email)


async def send_parental_consent_confirmation_email(tutor_email: str, alumno_email: str, alumno_nombre: str):
    """
    Notificación bidireccional inmediata al confirmarse el consentimiento parental.
    Envía confirmación formal al tutor legal y notificación de desbloqueo al alumno.
    """
    smtp_email, _ = get_smtp_credentials()
    if not smtp_email:
        print("Error: SMTP credentials not set. Cannot send confirmation emails.")
        return

    # 1. Correo formal para el Tutor Legal
    tutor_subject = f"Constancia de Autorización Parental Confirmada - {alumno_nombre}"
    tutor_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: sans-serif; background-color: #09090b; color: #e4e4e7; margin: 0; padding: 30px 15px; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 35px; }}
            .logo {{ font-size: 24px; font-weight: 900; color: #10b981; text-align: center; margin-bottom: 20px; }}
            .badge {{ display: inline-block; background-color: rgba(16, 185, 129, 0.2); color: #34d399; padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: bold; text-transform: uppercase; }}
            .title {{ font-size: 19px; font-weight: bold; color: #fff; margin: 15px 0; text-align: center; }}
            .content {{ font-size: 14px; line-height: 1.6; color: #a1a1aa; }}
            .content b {{ color: #e4e4e7; }}
            .highlight-box {{ background-color: #27272a; border-left: 4px solid #10b981; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #d4d4d8; }}
            .footer {{ margin-top: 30px; padding-top: 15px; border-top: 1px solid #27272a; text-align: center; font-size: 11px; color: #71717a; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">SYNCRO</div>
            <div style="text-align: center;"><span class="badge">Constancia Legal</span></div>
            <div class="title">Autorización Parental Registrada</div>
            <div class="content">
                Estimado/a Tutor Legal,<br><br>
                Le confirmamos que hemos registrado con éxito su <b>declaración y autorización legal</b> para que <b>{alumno_nombre}</b> utilice la plataforma Syncro.
            </div>
            <div class="highlight-box">
                ✔️ <b>Estado:</b> Cuenta Habilitada e Inmediatamente Activa.<br>
                🛡️ <b>Auditoría:</b> Se ha registrado de forma inmutable la marca temporal, dirección IP y aceptación de términos bajo fe de juramento.<br>
                📩 <b>Derechos ARCO:</b> Recuerde que puede solicitar la revocación o baja de datos en cualquier momento escribiendo a <b>soporte@syncro.app</b>.
            </div>
            <div class="footer">
                Syncro Fitness Platform &copy; 2026 • Protección de Datos Personales
            </div>
        </div>
    </body>
    </html>
    """

    # 2. Correo de bienvenida y desbloqueo para el Alumno
    alumno_subject = "¡Cuenta Habilitada! Tu tutor legal ha autorizado tu perfil en Syncro"
    alumno_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: sans-serif; background-color: #09090b; color: #e4e4e7; margin: 0; padding: 30px 15px; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 35px; }}
            .logo {{ font-size: 24px; font-weight: 900; color: #10b981; text-align: center; margin-bottom: 20px; }}
            .title {{ font-size: 20px; font-weight: bold; color: #fff; margin: 15px 0; text-align: center; }}
            .content {{ font-size: 14px; line-height: 1.6; color: #a1a1aa; }}
            .content b {{ color: #e4e4e7; }}
            .cta {{ text-align: center; margin: 25px 0; }}
            .btn {{ display: inline-block; background-color: #10b981; color: white; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 28px; border-radius: 10px; }}
            .footer {{ margin-top: 30px; padding-top: 15px; border-top: 1px solid #27272a; text-align: center; font-size: 11px; color: #71717a; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">SYNCRO</div>
            <div class="title">¡Tu cuenta ya está lista para entrenar! 🎉</div>
            <div class="content">
                Hola <b>{alumno_nombre}</b>,<br><br>
                Te avisamos que tu padre, madre o tutor legal acaba de completar la autorización parental requerida.<br><br>
                Tu cuenta ha sido desbloqueada por completo. Ya puedes ingresar a Syncro para ver tus rutinas asignadas, registrar tus pesos y seguir tu evolución deportiva junto a tu entrenador.
            </div>
            <div class="cta">
                <a href="https://syncro-clone.vercel.app/login" class="btn">Ingresar a Syncro</a>
            </div>
            <div class="footer">
                Syncro Fitness Platform &copy; 2026
            </div>
        </div>
    </body>
    </html>
    """

    # Enviar al tutor
    msg_tutor = EmailMessage()
    msg_tutor["From"] = f"Syncro Privacidad <{smtp_email}>"
    msg_tutor["Reply-To"] = "soporte@syncro.app"
    msg_tutor["To"] = tutor_email
    msg_tutor["Subject"] = tutor_subject
    msg_tutor.set_content(f"Autorización parental confirmada con éxito para {alumno_nombre}.")
    msg_tutor.add_alternative(tutor_html, subtype="html")
    await _send_smtp_robust(msg_tutor, tutor_email)

    # Enviar al alumno
    msg_alumno = EmailMessage()
    msg_alumno["From"] = f"Syncro Notificaciones <{smtp_email}>"
    msg_alumno["Reply-To"] = "soporte@syncro.app"
    msg_alumno["To"] = alumno_email
    msg_alumno["Subject"] = alumno_subject
    msg_alumno.set_content(f"Hola {alumno_nombre}, tu cuenta ha sido autorizada y habilitada.")
    msg_alumno.add_alternative(alumno_html, subtype="html")
    await _send_smtp_robust(msg_alumno, alumno_email)

