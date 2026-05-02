from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import traceback
import resend

app = Flask(__name__)
CORS(app)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
resend.api_key = RESEND_API_KEY


@app.route("/send-email", methods=["POST"])
def send_email():
    try:
        data = request.get_json()

        receiver = data.get("to")
        subject = data.get("subject", "No Subject")
        message = data.get("message", "")
        attachment_link = data.get("attachment", "")
        assigned_by = data.get("assigned_by_name", "Admin")

        if not receiver:
            return jsonify({"error": "No recipient"}), 400

        body = f"""
You have been assigned a new project.

📌 Title: {subject}

📝 Description:
{message}

👤 Assigned by: {assigned_by}

📎 Attachment:
{attachment_link if attachment_link else "No attachment"}
"""

        resend.Emails.send({
            "from": "ConsX <work@altruitymarketinggroup.com>",
            "to": receiver,
            "bcc": ["work@altruitymarketinggroup.com"],
            "subject": subject,
            "text": body
        })

        return jsonify({"status": "sent"}), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/")
def home():
    return "Backend is running 🚀"


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
