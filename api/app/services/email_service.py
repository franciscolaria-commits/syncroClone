import os
from email.message import EmailMessage
import aiosmtplib

SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

async def send_payment_reminder_email(alumno_email: str, alumno_nombre: str, entrenador_nombre: str, is_due_today: bool):
    """
    Envía un correo de recordatorio de pago.
    is_due_today = True -> El pago vence hoy.
    is_due_today = False -> El pago vence en 2 días.
    """
    if not SMTP_EMAIL or not SMTP_PASSWORD:
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

    message = EmailMessage()
    message["From"] = f"Syncro Notificaciones <{SMTP_EMAIL}>"
    message["To"] = alumno_email
    message["Subject"] = subject
    message.set_content("Por favor habilita HTML para ver este correo.")
    message.add_alternative(html_content, subtype="html")

    try:
        await aiosmtplib.send(
            message,
            hostname="smtp.gmail.com",
            port=465,
            use_tls=True,
            username=SMTP_EMAIL,
            password=SMTP_PASSWORD,
        )
        print(f"Email sent successfully to {alumno_email}")
    except Exception as e:
        print(f"Failed to send email to {alumno_email}: {e}")
