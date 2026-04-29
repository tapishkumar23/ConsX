from flask import Flask, request, jsonify
from flask_cors import CORS
import smtplib
import ssl
from email.message import EmailMessage
import os
import traceback

app = Flask(__name__)
CORS(app)

# 🔐 ENV VARIABLES (set these in Render dashboard)
EMAIL_USER=project.montverretechnologies@gmail.com
EMAIL_PASS=kmjgtmhefobpqwnf

@app.route("/send-email", methods=["POST"])
def send_email():
    try:
        data = request.get_json()
        print("🔥 Incoming data:", data)

        # 🔍 Validate ENV first
        if not SENDER_EMAIL or not APP_PASSWORD:
            print("❌ Missing EMAIL_USER or EMAIL_PASS")
            return jsonify({"error": "Email credentials not set"}), 500

        receiver = data.get("to")
        subject = data.get("subject", "No Subject")
        message = data.get("message", "")
        attachment_link = data.get("attachment", "")
        assigned_by = data.get("assigned_by_name", "Admin")

        if not receiver:
            return jsonify({"error": "No recipient"}), 400

        # ✉️ Email body
        body = f"""
You have been assigned a new project.

----------------------------------------
📌 Title: {subject}

📝 Description:
{message}

👤 Assigned by: {assigned_by}

----------------------------------------
📎 Attachment:
{attachment_link if attachment_link else "No attachment"}

Please check your dashboard for more details.
"""

        msg = EmailMessage()
        msg["From"] = SENDER_EMAIL
        msg["To"] = receiver
        msg["Subject"] = subject
        msg.set_content(body)

        print(f"📨 Sending email to: {receiver}")

        # 🔥 FIXED SMTP (TLS + context)
        context = ssl.create_default_context()

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.send_message(msg)

        print("✅ Email sent successfully")
        return jsonify({"status": "sent"}), 200

    except smtplib.SMTPAuthenticationError as e:
        print("❌ AUTH ERROR:", repr(e))
        return jsonify({"error": "SMTP Authentication failed"}), 500

    except Exception as e:
        print("❌ FULL ERROR:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# 🔥 Health check route (IMPORTANT for Render)
@app.route("/")
def home():
    return "Backend is running 🚀"


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
