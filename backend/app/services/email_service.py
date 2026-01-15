from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr

conf = ConnectionConfig(
    MAIL_USERNAME="done2.DD@gmail.com",
    MAIL_PASSWORD="uztq revd meqb nrol", 
    MAIL_FROM="done2.DD@gmail.com",
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,        
    MAIL_SSL_TLS=False,  
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)

async def send_welcome_email(email_to: EmailStr, username: str, verification_link: str):
    html_content = f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenue</title>
        <style>
            body {{
                background-color: #f8fafc;
                margin: 0;
                padding: 0;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.5;
                color: #334155;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                border: 1px solid #e2e8f0;
            }}
            .header {{
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                color: #ffffff;
                text-align: center;
                padding: 40px 20px;
            }}
            .header img {{
                max-height: 80px;
                margin-bottom: 20px;
                border-radius: 12px;
            }}
            .content {{
                padding: 40px;
                font-size: 16px;
            }}
            .button-container {{
                text-align: center;
                margin: 30px 0;
            }}
            .button {{
                display: inline-block;
                padding: 16px 32px;
                background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                color: #ffffff !important;
                text-decoration: none;
                font-weight: 600;
                font-size: 16px;
                border-radius: 8px;
                box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3), 0 2px 4px -1px rgba(79, 70, 229, 0.2);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                border: none;
                cursor: pointer;
                letter-spacing: 0.5px;
            }}
            .button:hover {{
                background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
                box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3), 0 4px 6px -2px rgba(79, 70, 229, 0.2);
                transform: translateY(-2px);
            }}
            .footer {{
                margin-top: 40px;
                text-align: center;
                font-size: 14px;
                color: #64748b;
                padding: 20px;
                border-top: 1px solid #f1f5f9;
            }}
            .greeting {{
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 24px;
            }}
            .signature {{
                margin-top: 32px;
                font-style: italic;
                color: #475569;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://i.postimg.cc/Xv7y7MF8/chatbot.jpg" alt="Chatbot Logo">
                <h1 style="margin:0;font-size:28px">Bienvenue sur Chatbot as a Service</h1>
            </div>
            <div class="content">
                <div class="greeting">Bonjour {username},</div>
                
                <p>Nous sommes ravis de vous accueillir sur notre plateforme <strong>Chatbot as a Service</strong>.</p>
                
                <p>Pour activer votre compte et commencer à profiter de nos services, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>
                
                <div class="button-container">
                    <a href="{verification_link}" class="button">Confirmer mon email</a>
                </div>
                
                <p>Ce lien expirera dans 24 heures. Si vous n'avez pas créé ce compte, vous pouvez ignorer ce message en toute sécurité.</p>
                
                <div class="signature">
                    <p>Cordialement,<br>L'équipe Chatbot as a Service</p>
                </div>
            </div>
            <div class="footer">
                © 2025 Chatbot as a Service. Tous droits réservés.<br>
                <small>Si vous rencontrez des problèmes, contactez-nous à support@chatbot-service.com</small>
            </div>
        </div>
    </body>
    </html>
    """

    message = MessageSchema(
        subject="🎉 Activez votre compte Chatbot as a Service",
        recipients=[email_to],
        body=html_content,
        subtype="html"
    )

    fm = FastMail(conf)
    await fm.send_message(message)

async def send_reset_password_email(email_to: str, name: str, reset_url: str):
    message = MessageSchema(
        subject="Réinitialisation de votre mot de passe",
        recipients=[email_to],
        body=f"Bonjour {name},\n\nCliquez sur ce lien pour réinitialiser votre mot de passe : {reset_url}\n\nLe lien expire dans 1 heure.",
        subtype="plain"
    )
    fm = FastMail(conf)
    await fm.send_message(message)