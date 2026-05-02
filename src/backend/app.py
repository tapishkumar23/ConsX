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
        subject = data.get("subject", "No Subject")  # this is actual project title
        message = data.get("message", "No description provided")
        attachment_link = data.get("attachment", "")
        assigned_by = data.get("assigned_by_name", "Admin")
        deadline = data.get("deadline", "Not specified")

        if not receiver:
            return jsonify({"error": "No recipient"}), 400

        # HTML Email Template
        html_body = f"""
        <div style="background:#f6f8fb; padding:30px 0; font-family:Arial, sans-serif;">
          
          <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">

            <!-- Header -->
            <div style="background:#0B3D2E; color:white; padding:16px 24px;">
              <h2 style="margin:0; font-size:18px;">📌 New Project Assigned</h2>
            </div>

            <!-- Body -->
            <div style="padding:24px; color:#333; line-height:1.6;">

              <p style="margin-top:0;">Hello,</p>

              <p>
                You’ve been assigned a new project. Please review the details below:
              </p>

              <!-- Card -->
              <div style="background:#f9fafb; padding:16px; border-radius:8px; margin-top:20px;">

                <p style="margin:8px 0;">
                  <strong>📌 Project Title:</strong><br>
                  {subject}
                </p>

                <p style="margin:8px 0;">
                  <strong>📝 Description:</strong><br>
                  {message}
                </p>

                <p style="margin:8px 0;">
                  <strong>📅 Deadline:</strong>
                  <span style="color:#d32f2f; font-weight:bold;">
                    {deadline}
                  </span>
                </p>

                <p style="margin:8px 0;">
                  <strong>👤 Assigned by:</strong> {assigned_by}
                </p>

                {f'''
                <p style="margin:8px 0;">
                  <strong>📎 Attachment:</strong><br>
                  <a href="{attachment_link}" style="color:#0B3D2E; text-decoration:none; font-weight:500;">
                    View Attachment
                  </a>
                </p>
                ''' if attachment_link else ""}

              </div>

              <!-- Footer note -->
              <p style="margin-top:24px; font-size:13px; color:#777;">
                Please ensure timely completion of the task.
              </p>

            </div>

            <!-- Footer -->
            <div style="background:#f1f3f5; padding:12px 24px; text-align:center; font-size:12px; color:#888;">
              This is an automated email from ConsX
            </div>

          </div>
        </div>
        """

        # Send Email (clean subject line)
        resend.Emails.send({
            "from": "Altruity Marketing <work@altruitymarketinggroup.com>",
            "to": [receiver],
            "bcc": ["work@altruitymarketinggroup.com"],
            "subject": f"Project Assigned: {subject}",
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
