"""
backend/app/services/email.py
Service for sending email invitations.
"""
import os
import aiohttp
from typing import Optional

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")

async def send_invitation_email(to_email: str, invite_link: str, project_name: str, role: str) -> bool:
    """
    Send an invitation email using Resend API.
    If no API key is provided, falls back to printing the link to stdout.
    """
    if not RESEND_API_KEY or RESEND_API_KEY == "mock":
        print("="*60)
        print(f"[MOCK EMAIL] To: {to_email}")
        print(f"Subject: You've been invited to {project_name}")
        print(f"Role: {role}")
        print(f"Link: {invite_link}")
        print("="*60)
        return True

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json",
    }
    html_content = f"""
    <h2>You've been invited to join: {project_name}</h2>
    <p>Role: <strong>{role.replace('_', ' ').title()}</strong></p>
    <p>Click the link below to accept the invitation and set your password:</p>
    <a href="{invite_link}" style="display:inline-block;padding:10px 20px;background-color:#007BFF;color:white;text-decoration:none;border-radius:5px;">Accept Invitation</a>
    """
    
    payload = {
        "from": "FieldPulse AI <onboarding@resend.dev>",
        "to": [to_email],
        "subject": f"Invitation: Join {project_name} on FieldPulse AI",
        "html": html_content
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                if response.status in (200, 201):
                    return True
                else:
                    text = await response.text()
                    print(f"[Email Service] Failed to send email: {response.status} {text}")
                    return False
    except Exception as e:
        print(f"[Email Service] Error: {e}")
        return False
