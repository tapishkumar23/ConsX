from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import traceback
import resend

app = Flask(__name__)
CORS(app)

# Set API Key
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
resend.api_key = RESEND_API_KEY


@app.route("/send-email", methods=["POST"])
def send_email():
    try:
        data = request.get_json()

        receiver = data.get("to")
        subject = data.get("subject", "No Subject")
        message = data.get("message", "No description provided")
        attachment_link = data.get("attachment", "")
        assigned_by = data.get("assigned_by_name", "Admin")
        deadline = data.get("deadline", "Not specified")

        if not receiver:
            return jsonify({"error": "No recipient"}), 400

        # HTML Email Template
        html_body = f"""
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f8;">
            
            <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                
                <h2 style="color: #2c3e50; margin-bottom: 10px;">📌 New Project Assigned</h2>

                <p style="color:#555;">Hello,</p>

                <p style="color:#555;">
                    You have been assigned a new project. Please review the details below:
                </p>

                <hr style="margin: 20px 0;"/>

                <p><strong>📌 Title:</strong><br/> {subject}</p>

                <p><strong>📝 Description:</strong><br/> {message}</p>

                <p>
                    <strong>📅 Deadline:</strong> 
                    <span style="color: #e74c3c; font-weight: bold;">
                        {deadline}
                    </span>
                </p>

                <p><strong>👤 Assigned by:</strong> {assigned_by}</p>

                <p><strong>📎 Attachment:</strong><br/>
                    {f'<a href="{attachment_link}" target="_blank">View Attachment</a>' if attachment_link else "No attachment"}
                </p>

                <hr style="margin: 20px 0;"/>

                <p style="font-size: 12px; color: gray;">
                    This is an automated email from ConsX system.
                </p>

            </div>
        </div>
        """

        # Send Email
        resend.Emails.send({
            "from": "Altruity Marketing <work@altruitymarketinggroup.com>",
            "to": [receiver],
            "bcc": ["work@altruitymarketinggroup.com"],
            "subject": subject,
            "html": html_body
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
