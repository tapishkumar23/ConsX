from flask import Flask, request, jsonify
from flask_cors import CORS
import smtplib
from email.message import EmailMessage
import os

app = Flask(__name__)
CORS(app)

# ⚠️ TEMP ONLY — DO NOT COMMIT THIS
SENDER_EMAIL = "project.montverretechnologies@gmail.com"
APP_PASSWORD = "kmjgtmhefobpqwnf"  # no spaces


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

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.send_message(msg)

        print("✅ Email sent successfully")
        return jsonify({"status": "sent"}), 200

    except Exception as e:
        print("❌ ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)