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
    Soporta múltiples aliases comunes de configuración cloud (SMTP_EMAIL, SMTP_USER, etc.).
    Limpia espacios y comillas accidentales.
    """
    raw_email = (
        os.getenv("SMTP_EMAIL")
        or os.getenv("SMTP_USER")
        or os.getenv("EMAIL_USER")
        or os.getenv("MAIL_USERNAME")
        or os.getenv("SMTP_MAIL")
        or os.getenv("smtp_email")
        or os.getenv("smtp_user")
        or ""
    )
    raw_pass = (
        os.getenv("SMTP_PASSWORD")
        or os.getenv("SMTP_PASS")
        or os.getenv("EMAIL_PASSWORD")
        or os.getenv("MAIL_PASSWORD")
        or os.getenv("smtp_password")
        or os.getenv("smtp_pass")
        or ""
    )
    smtp_email = raw_email.strip().strip('"').strip("'").lower()
    smtp_pass = raw_pass.strip().strip('"').strip("'")
    return smtp_email, smtp_pass

async def _send_smtp_robust(message: EmailMessage, recipient: str) -> bool:
    """
    Envío SMTP de alta resiliencia para entornos cloud:
    Intenta Puerto 465 (SSL directo) y si falla o hay timeout en la nube,
    reintenta automáticamente por Puerto 587 (STARTTLS).
    Maneja contraseñas de aplicación con y sin espacios.
    """
    smtp_email, smtp_password = get_smtp_credentials()
    if not smtp_email or not smtp_password:
        print(f"[EmailService] Error: Credenciales SMTP no configuradas (email='{smtp_email}', pass_len={len(smtp_password)}). No se puede enviar a {recipient}.")
        return False

    passwords_to_try = [smtp_password]
    clean_pass = smtp_password.replace(" ", "")
    if clean_pass != smtp_password:
        passwords_to_try.append(clean_pass)

    # Intento 1: Puerto 465 SSL directo
    for pwd in passwords_to_try:
        try:
            await aiosmtplib.send(
                message,
                hostname="smtp.gmail.com",
                port=465,
                use_tls=True,
                username=smtp_email,
                password=pwd,
                timeout=15,
            )
            print(f"[EmailService] Correo enviado exitosamente a {recipient} via puerto 465 (SSL)")
            return True
        except Exception as e1:
            print(f"[EmailService] Puerto 465 SSL fallo para {recipient}: {type(e1).__name__} - {e1}")

    # Intento 2: Puerto 587 STARTTLS
    for pwd in passwords_to_try:
        try:
            await aiosmtplib.send(
                message,
                hostname="smtp.gmail.com",
                port=587,
                start_tls=True,
                username=smtp_email,
                password=pwd,
                timeout=15,
            )
            print(f"[EmailService] Correo enviado exitosamente a {recipient} via puerto 587 (STARTTLS)")
            return True
        except Exception as e2:
            print(f"[EmailService] Puerto 587 STARTTLS fallo para {recipient}: {type(e2).__name__} - {e2}")

async def _send_via_http_api(recipient: str, subject: str, html_content: str) -> bool:
    """
    Intenta el envío mediante APIs HTTP (Puerto 443 HTTPS), evitando el bloqueo
    de puertos SMTP (25, 465, 587) impuesto por Render en sus planes gratuitos.
    Soporta Resend y Brevo.
    """
    import json
    import urllib.request
    import urllib.error
    import asyncio

    resend_key = (os.getenv("RESEND_API_KEY") or "").strip().strip('"').strip("'")
    if resend_key:
        configured_from = (os.getenv("EMAIL_FROM") or "").strip().strip('"').strip("'")
        # Si EMAIL_FROM está vacío o usa dominios públicos que no se pueden verificar en Resend,
        # usar el remitente oficial de pruebas de Resend: "Syncro <onboarding@resend.dev>"
        if not configured_from or any(d in configured_from.lower() for d in ["@gmail.", "@yahoo.", "@hotmail.", "@outlook.", "@live."]):
            from_email = "Syncro <onboarding@resend.dev>"
        else:
            from_email = configured_from

        payload = {
            "from": from_email,
            "to": [recipient],
            "subject": subject,
            "html": html_content
        }

        smtp_email, _ = get_smtp_credentials()
        reply_target = smtp_email or (configured_from if "@" in configured_from else None)
        if reply_target and "@" in reply_target:
            payload["reply_to"] = reply_target

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=data,
            headers={
                "Authorization": f"Bearer {resend_key}",
                "Content-Type": "application/json",
                "User-Agent": "Syncro-API/1.0"
            },
            method="POST"
        )
        try:
            loop = asyncio.get_event_loop()
            def do_resend():
                with urllib.request.urlopen(req, timeout=12) as resp:
                    body = resp.read().decode("utf-8", errors="replace")
                    return resp.status in (200, 201), body
            success, body = await loop.run_in_executor(None, do_resend)
            if success:
                print(f"[EmailService] Correo entregado exitosamente a {recipient} via Resend HTTP API (Puerto 443): {body}")
                return True
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace") if e.fp else ""
            print(f"[EmailService] Resend HTTP Error {e.code}: {err_body}")
        except Exception as e:
            print(f"[EmailService] Error conectando a Resend API: {e}")

    brevo_key = (os.getenv("BREVO_API_KEY") or "").strip().strip('"').strip("'")
    if brevo_key:
        smtp_email, _ = get_smtp_credentials()
        from_email = smtp_email or "syncroclone@gmail.com"
        payload = {
            "sender": {"name": "Syncro", "email": from_email},
            "to": [{"email": recipient}],
            "subject": subject,
            "htmlContent": html_content
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            "https://api.brevo.com/v3/smtp/email",
            data=data,
            headers={
                "api-key": brevo_key,
                "Content-Type": "application/json",
                "User-Agent": "Syncro-API/1.0"
            },
            method="POST"
        )
        try:
            loop = asyncio.get_event_loop()
            def do_brevo():
                with urllib.request.urlopen(req, timeout=12) as resp:
                    return resp.status in (200, 201)
            success = await loop.run_in_executor(None, do_brevo)
            if success:
                print(f"[EmailService] Correo entregado exitosamente a {recipient} via Brevo HTTP API (Puerto 443)")
                return True
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace") if e.fp else ""
            print(f"[EmailService] Brevo HTTP Error {e.code}: {err_body}")
        except Exception as e:
            print(f"[EmailService] Error conectando a Brevo API: {e}")

    return False

async def probar_envio_resend(recipient: str) -> dict:
    """
    Envía un correo de prueba directo mediante Resend HTTPS API (Puerto 443)
    y retorna un informe exhaustivo con código HTTP y respuesta del proveedor.
    """
    import json
    import urllib.request
    import urllib.error
    import asyncio

    resend_key = (os.getenv("RESEND_API_KEY") or "").strip().strip('"').strip("'")
    if not resend_key:
        return {
            "destinatario": recipient,
            "enviado_con_exito": False,
            "status_code": None,
            "mensaje": "Variable de entorno RESEND_API_KEY no encontrada en el servidor."
        }

    configured_from = (os.getenv("EMAIL_FROM") or "").strip().strip('"').strip("'")
    if not configured_from or any(d in configured_from.lower() for d in ["@gmail.", "@yahoo.", "@hotmail.", "@outlook.", "@live."]):
        from_email = "Syncro <onboarding@resend.dev>"
    else:
        from_email = configured_from

    smtp_email, _ = get_smtp_credentials()

    payload = {
        "from": from_email,
        "to": [recipient],
        "subject": "Prueba de Envío y Conectividad - Syncro Fitness Platform",
        "html": f"""
        <div style="font-family: sans-serif; background-color: #09090b; color: #fff; padding: 25px; border-radius: 12px;">
            <h2 style="color: #10b981;">✅ Correo de Prueba Exitoso</h2>
            <p>Este correo confirma que el motor de despacho vía <b>Resend HTTPS API (Puerto 443)</b> está 100% operativo en producción en Render.</p>
            <p style="color: #a1a1aa; font-size: 13px;">Syncro Fitness Platform &copy; 2026</p>
        </div>
        """
    }
    reply_target = smtp_email or (configured_from if "@" in configured_from else None)
    if reply_target and "@" in reply_target:
        payload["reply_to"] = reply_target

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=data,
        headers={
            "Authorization": f"Bearer {resend_key}",
            "Content-Type": "application/json",
            "User-Agent": "Syncro-API/1.0"
        },
        method="POST"
    )

    try:
        loop = asyncio.get_event_loop()
        def do_req():
            with urllib.request.urlopen(req, timeout=12) as resp:
                return resp.status, resp.read().decode("utf-8", errors="replace")

        status, body_str = await loop.run_in_executor(None, do_req)
        parsed = {}
        try:
            parsed = json.loads(body_str)
        except Exception:
            pass

        return {
            "destinatario": recipient,
            "enviado_con_exito": status in (200, 201),
            "status_code": status,
            "id_mensaje": parsed.get("id"),
            "mensaje": "¡Correo de prueba enviado y aceptado por Resend! Revisa tu bandeja de entrada y Spam.",
            "remitente_utilizado": from_email
        }
    except urllib.error.HTTPError as e:
        raw_err = e.read().decode("utf-8", errors="replace") if e.fp else ""
        sugerencia = ""
        if e.code == 403 and "own email address" in raw_err:
            sugerencia = "Restricción de cuenta gratuita de Resend: Con 'onboarding@resend.dev', Resend solo permite enviar al correo con el que te registraste en Resend. Para enviar a cualquier tutor, debes verificar un dominio propio en resend.com/domains o el alumno puede compartir el Enlace Directo."
        return {
            "destinatario": recipient,
            "enviado_con_exito": False,
            "status_code": e.code,
            "error_proveedor": raw_err,
            "sugerencia": sugerencia,
            "mensaje": f"Resend rechazó el envío (HTTP {e.code}). {sugerencia}"
        }
    except Exception as e:
        return {
            "destinatario": recipient,
            "enviado_con_exito": False,
            "status_code": None,
            "mensaje": f"Error de conexión: {str(e)}"
        }

async def _send_via_google_relay(recipient: str, subject: str, html_content: str) -> bool:
    """
    Envía correos a través del Webhook Relay de Google Apps Script (HTTPS Puerto 443).
    Despacha nativamente desde syncroclone@gmail.com a CUALQUIER destinatario del mundo
    sin bloqueos de puertos en Render ni restricciones de dominio de Resend.
    """
    relay_url = (os.getenv("GMAIL_RELAY_URL") or os.getenv("GOOGLE_RELAY_URL") or "").strip().strip('"').strip("'")
    if not relay_url:
        return False

    relay_secret = (os.getenv("GMAIL_RELAY_SECRET") or os.getenv("GOOGLE_RELAY_SECRET") or "").strip().strip('"').strip("'")

    payload = {
        "to": recipient,
        "subject": subject,
        "html": html_content,
        "from_name": "Syncro Fitness"
    }
    if relay_secret:
        payload["secret"] = relay_secret

    import asyncio
    loop = asyncio.get_event_loop()

    def do_post():
        try:
            import requests
            resp = requests.post(relay_url, json=payload, timeout=15)
            if resp.status_code == 200:
                res_json = resp.json()
                if res_json.get("success"):
                    print(f"[EmailService] Correo entregado exitosamente a {recipient} via Google Apps Script Relay (Puerto 443)")
                    return True
                else:
                    print(f"[EmailService] Google Relay respondió error: {res_json.get('error')}")
            else:
                print(f"[EmailService] Google Relay HTTP {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            try:
                import json
                import urllib.request
                data = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(
                    relay_url,
                    data=data,
                    headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=15) as r:
                    res_json = json.loads(r.read().decode("utf-8", errors="replace"))
                    if res_json.get("success"):
                        print(f"[EmailService] Correo entregado exitosamente a {recipient} via Google Relay (urllib)")
                        return True
            except Exception as e_sub:
                print(f"[EmailService] Error conectando a Google Relay: {e} / {e_sub}")
        return False

    return await loop.run_in_executor(None, do_post)

async def probar_envio_google_relay(recipient: str) -> dict:
    """
    Envía un correo de prueba en tiempo real a través de Google Apps Script Relay
    y retorna el estado detallado para diagnostico-smtp.
    """
    relay_url = (os.getenv("GMAIL_RELAY_URL") or os.getenv("GOOGLE_RELAY_URL") or "").strip().strip('"').strip("'")
    if not relay_url:
        return {
            "destinatario": recipient,
            "enviado_con_exito": False,
            "status_code": None,
            "mensaje": "Variable de entorno GMAIL_RELAY_URL no configurada."
        }

    relay_secret = (os.getenv("GMAIL_RELAY_SECRET") or os.getenv("GOOGLE_RELAY_SECRET") or "").strip().strip('"').strip("'")

    payload = {
        "to": recipient,
        "subject": "Prueba de Envío y Conectividad - Syncro Fitness Platform",
        "html": f"""
        <div style="font-family: sans-serif; background-color: #09090b; color: #fff; padding: 25px; border-radius: 12px; border: 1px solid #27272a;">
            <h2 style="color: #10b981; margin-top: 0;">✅ Despacho Exitoso vía Google Relay</h2>
            <p>Este correo confirma que el motor de despacho vía <b>Google Apps Script Relay (HTTPS Puerto 443)</b> está 100% operativo en producción.</p>
            <p>Se envió directamente desde <b>syncroclone@gmail.com</b> sin bloqueos de firewall y sin restricciones de dominio hacia <b>{recipient}</b>.</p>
            <hr style="border: none; border-top: 1px solid #27272a; margin: 20px 0;">
            <p style="color: #a1a1aa; font-size: 12px;">Syncro Fitness Platform &copy; 2026</p>
        </div>
        """,
        "from_name": "Syncro Fitness"
    }
    if relay_secret:
        payload["secret"] = relay_secret

    import asyncio
    loop = asyncio.get_event_loop()

    def do_test():
        try:
            import requests
            resp = requests.post(relay_url, json=payload, timeout=15)
            if resp.status_code == 200:
                res_json = resp.json()
                if res_json.get("success"):
                    return {
                        "destinatario": recipient,
                        "enviado_con_exito": True,
                        "status_code": 200,
                        "mensaje": "¡Correo de prueba enviado y recibido exitosamente por Google Apps Script Relay!",
                        "remitente_utilizado": "syncroclone@gmail.com"
                    }
                else:
                    return {
                        "destinatario": recipient,
                        "enviado_con_exito": False,
                        "status_code": 200,
                        "mensaje": f"Google Relay rechazó la solicitud: {res_json.get('error')}"
                    }
            return {
                "destinatario": recipient,
                "enviado_con_exito": False,
                "status_code": resp.status_code,
                "mensaje": f"Google Relay HTTP {resp.status_code}: {resp.text[:200]}"
            }
        except Exception as e:
            return {
                "destinatario": recipient,
                "enviado_con_exito": False,
                "status_code": None,
                "mensaje": f"Error de conexión a Google Relay: {str(e)}"
            }

    return await loop.run_in_executor(None, do_test)

async def _dispatch_email_multichannel(recipient: str, subject: str, html_content: str, text_content: str = "") -> bool:
    """
    Canal inteligente de despacho:
    1. Si existe GMAIL_RELAY_URL, despacha por Google Apps Script Webhook (Puerto 443 HTTPS).
       Envía desde syncroclone@gmail.com hacia CUALQUIER tutor sin restricción de dominio ni bloqueo de Render.
    2. Si existe RESEND_API_KEY o BREVO_API_KEY, despacha por HTTP (Puerto 443).
    3. En caso contrario (o si falla), intenta despacho SMTP directo por puertos 465 y 587.
    """
    # 1. Google Apps Script Relay (prioridad máxima para enviar a cualquier destinatario sin dominio)
    if os.getenv("GMAIL_RELAY_URL") or os.getenv("GOOGLE_RELAY_URL"):
        if await _send_via_google_relay(recipient, subject, html_content):
            return True

    # 2. Resend / Brevo HTTP API
    if os.getenv("RESEND_API_KEY") or os.getenv("BREVO_API_KEY"):
        if await _send_via_http_api(recipient, subject, html_content):
            return True

    # 3. Fallback SMTP
    smtp_email, _ = get_smtp_credentials()
    message = EmailMessage()
    message["From"] = f"Syncro Privacidad <{smtp_email}>" if smtp_email else "Syncro <syncroclone@gmail.com>"
    if smtp_email:
        message["Reply-To"] = smtp_email
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(text_content or "Por favor habilita HTML para visualizar este mensaje.")
    message.add_alternative(html_content, subtype="html")

    return await _send_smtp_robust(message, recipient)

async def send_payment_reminder_email(alumno_email: str, alumno_nombre: str, entrenador_nombre: str, is_due_today: bool):
    """
    Envía un correo de recordatorio de pago.
    is_due_today = True -> El pago vence hoy.
    is_due_today = False -> El pago vence en 2 días.
    """
    relay_url = os.getenv("GMAIL_RELAY_URL") or os.getenv("GOOGLE_RELAY_URL")
    resend_key = os.getenv("RESEND_API_KEY")
    brevo_key = os.getenv("BREVO_API_KEY")
    smtp_email, _ = get_smtp_credentials()
    if not relay_url and not resend_key and not brevo_key and not smtp_email:
        print("[EmailService] Error: Credenciales de correo no configuradas. No se puede enviar recordatorio de pago.")
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

    await _dispatch_email_multichannel(
        alumno_email,
        subject,
        html_content,
        f"Recordatorio de pago - {entrenador_nombre}. Por favor regularice su cuota."
    )


async def send_parental_consent_request_email(tutor_email: str, alumno_nombre: str, entrenador_nombre: str, token: str) -> bool:
    """
    Despacha plantilla HTML responsiva con los fines del tratamiento (planificación deportiva,
    cargas de peso, métricas y asistencia), personas con acceso autorizado, canales de revocación
    y botón con enlace seguro. Retorna True si se despachó con éxito, False en caso contrario.
    """
    relay_url = os.getenv("GMAIL_RELAY_URL") or os.getenv("GOOGLE_RELAY_URL")
    resend_key = os.getenv("RESEND_API_KEY")
    brevo_key = os.getenv("BREVO_API_KEY")
    smtp_email, smtp_password = get_smtp_credentials()
    if not relay_url and not resend_key and not brevo_key and (not smtp_email or not smtp_password):
        print(f"[EmailService] Error: Credenciales de correo no disponibles (GoogleRelay/Resend/Brevo/SMTP). No se despacha.")
        return False

    frontend_url = os.getenv("FRONTEND_URL", "https://syncro-clone.vercel.app").rstrip("/")
    auth_url = f"{frontend_url}/consentimiento-tutor?token={token}"
    subject = f"Autorización Parental Requerida para {alumno_nombre} - Syncro Platform"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="dark">
        <meta name="supported-color-schemes" content="dark">
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #09090b;
                color: #e4e4e7;
                margin: 0;
                padding: 16px 8px;
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
            }}
            .container {{
                max-width: 580px;
                width: 100%;
                margin: 0 auto;
                background-color: #18181b;
                border: 1px solid #27272a;
                border-radius: 16px;
                padding: 28px 20px;
                box-shadow: 0 15px 35px rgba(0,0,0,0.6);
                box-sizing: border-box;
            }}
            .logo {{
                font-size: 24px;
                font-weight: 900;
                color: #10b981;
                text-align: center;
                letter-spacing: -0.5px;
                margin-bottom: 6px;
            }}
            .badge-header {{
                text-align: center;
                margin-bottom: 20px;
            }}
            .badge {{
                display: inline-block;
                background-color: rgba(16, 185, 129, 0.15);
                color: #34d399;
                border: 1px solid rgba(16, 185, 129, 0.3);
                padding: 4px 12px;
                border-radius: 9999px;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.5px;
                text-transform: uppercase;
            }}
            .title {{
                font-size: 20px;
                font-weight: 800;
                color: #ffffff;
                margin-bottom: 14px;
                text-align: center;
                line-height: 1.35;
            }}
            .lead {{
                font-size: 14px;
                line-height: 1.6;
                color: #d4d4d8;
                margin-bottom: 20px;
            }}
            .card {{
                background-color: #27272a;
                border: 1px solid #3f3f46;
                border-radius: 12px;
                padding: 16px 14px;
                margin-bottom: 18px;
                box-sizing: border-box;
            }}
            .card-title {{
                font-size: 12px;
                font-weight: 700;
                color: #34d399;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 12px;
            }}
            .item-table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 10px;
            }}
            .item-table:last-child {{
                margin-bottom: 0;
            }}
            .item-icon {{
                width: 26px;
                min-width: 26px;
                vertical-align: top;
                font-size: 16px;
                line-height: 1.5;
                padding: 0 8px 0 0;
            }}
            .item-text {{
                vertical-align: top;
                font-size: 13px;
                line-height: 1.55;
                color: #a1a1aa;
                padding: 0;
            }}
            .item-text strong {{
                color: #f4f4f5;
                font-weight: 700;
            }}
            .cta-container {{
                text-align: center;
                margin: 28px 0 20px 0;
            }}
            .btn {{
                display: inline-block;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                background-color: #10b981;
                color: #ffffff !important;
                text-decoration: none;
                font-weight: 800;
                font-size: 15px;
                padding: 15px 28px;
                border-radius: 12px;
                box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);
                box-sizing: border-box;
                max-width: 100%;
            }}
            .link-fallback {{
                font-size: 12px;
                color: #71717a;
                word-break: break-all;
                overflow-wrap: break-word;
                text-align: center;
                margin-top: 14px;
                line-height: 1.45;
            }}
            .link-fallback a {{
                color: #34d399;
                text-decoration: underline;
                word-break: break-all;
            }}
            .legal-notice {{
                margin-top: 24px;
                padding-top: 16px;
                border-top: 1px solid #27272a;
                font-size: 12px;
                line-height: 1.55;
                color: #71717a;
            }}
            .footer {{
                text-align: center;
                font-size: 11px;
                color: #52525b;
                margin-top: 20px;
            }}
            @media only screen and (max-width: 480px) {{
                .container {{
                    padding: 20px 14px !important;
                    border-radius: 12px !important;
                }}
                .title {{
                    font-size: 18px !important;
                }}
                .btn {{
                    width: 100% !important;
                    padding: 14px 16px !important;
                    font-size: 14px !important;
                }}
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
                <table role="presentation" class="item-table" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td class="item-icon">🏋️</td>
                        <td class="item-text"><strong>Planificación deportiva:</strong> Diseño y asignación de rutinas de fuerza y acondicionamiento.</td>
                    </tr>
                </table>
                <table role="presentation" class="item-table" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td class="item-icon">📊</td>
                        <td class="item-text"><strong>Cargas y marcas:</strong> Registro de peso corporal, repeticiones y evolución de rendimiento.</td>
                    </tr>
                </table>
                <table role="presentation" class="item-table" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td class="item-icon">📅</td>
                        <td class="item-text"><strong>Asistencia:</strong> Control de presencia y seguridad en sesiones presenciales.</td>
                    </tr>
                </table>
            </div>

            <div class="card">
                <div class="card-title">Privacidad y Seguridad Garantizada</div>
                <table role="presentation" class="item-table" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td class="item-icon">🔒</td>
                        <td class="item-text"><strong>Acceso restringido:</strong> Únicamente el alumno y su entrenador acreditado ({entrenador_nombre}) acceden a las métricas deportivas.</td>
                    </tr>
                </table>
                <table role="presentation" class="item-table" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td class="item-icon">🛡️</td>
                        <td class="item-text"><strong>Minimización de datos:</strong> Conforme a nuestros estándares, <strong>no solicitamos DNI</strong> ni del alumno ni del tutor legal.</td>
                    </tr>
                </table>
                <table role="presentation" class="item-table" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td class="item-icon">✉️</td>
                        <td class="item-text"><strong>Canal de revocación:</strong> Puede revocar este consentimiento o solicitar la eliminación total de datos en cualquier momento escribiendo a <a href="mailto:soporte@syncro.app" style="color: #34d399; text-decoration: underline;">soporte@syncro.app</a>.</td>
                    </tr>
                </table>
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

    return await _dispatch_email_multichannel(
        tutor_email,
        subject,
        html_content,
        f"Autorización parental requerida para {alumno_nombre}. Ingrese a {auth_url} para autorizar."
    )


async def send_parental_consent_confirmation_email(tutor_email: str, alumno_email: str, alumno_nombre: str):
    """
    Notificación bidireccional inmediata al confirmarse el consentimiento parental.
    Envía confirmación formal al tutor legal y notificación de desbloqueo al alumno.
    """
    relay_url = os.getenv("GMAIL_RELAY_URL") or os.getenv("GOOGLE_RELAY_URL")
    resend_key = os.getenv("RESEND_API_KEY")
    brevo_key = os.getenv("BREVO_API_KEY")
    smtp_email, _ = get_smtp_credentials()
    frontend_url = os.getenv("FRONTEND_URL", "https://syncro-clone.vercel.app").rstrip("/")
    if not relay_url and not resend_key and not brevo_key and not smtp_email:
        print("[EmailService] Error: Credenciales de correo no configuradas. No se pueden enviar confirmaciones.")
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
                <a href="{frontend_url}/login" class="btn">Ingresar a Syncro</a>
            </div>
            <div class="footer">
                Syncro Fitness Platform &copy; 2026
            </div>
        </div>
    </body>
    </html>
    """

    # Enviar al tutor
    res_tutor = await _dispatch_email_multichannel(
        tutor_email,
        tutor_subject,
        tutor_html,
        f"Autorización parental confirmada con éxito para {alumno_nombre}."
    )

    # Enviar al alumno
    res_alumno = await _dispatch_email_multichannel(
        alumno_email,
        alumno_subject,
        alumno_html,
        f"Hola {alumno_nombre}, tu cuenta ha sido autorizada y habilitada."
    )
    return res_tutor and res_alumno

