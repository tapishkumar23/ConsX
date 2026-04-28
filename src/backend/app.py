from flask import Flask, request, jsonify
from flask_cors import CORS
import smtplib
from email.message import EmailMessage

app = Flask(__name__)
CORS(app)

# 🔥 CONFIG
SENDER_EMAIL = "project.montverretechnologies@gmail.com"
APP_PASSWORD = "kmjg tmhe fobp qwnf"  # 🔥 replace with real app password


@app.route("/send-email", methods=["POST"])
def send_email():
    try:
        data = request.get_json()
        print("🔥 Incoming data:", data)

        receiver = data.get("to")
        subject = data.get("subject", "No Subject")
        message = data.get("message", "")
        attachment_link = data.get("attachment", "")
        assigned_by = data.get("assigned_by_name", "Admin")

        if not receiver:
            return jsonify({"error": "No recipient"}), 400

        # 🔥 Email content
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

        print("🚀 Connecting to Gmail...")

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.send_message(msg)

        print("✅ Email sent successfully")
        return jsonify({"status": "sent"}), 200

    except smtplib.SMTPAuthenticationError as e:
        print("❌ AUTH ERROR:", e)
        return jsonify({"error": "Authentication failed"}), 500

    except Exception as e:
        print("❌ ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)