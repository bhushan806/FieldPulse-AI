import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000/api"

print("1. Logging in as HQ...")
res = requests.post(f"{BASE_URL}/auth/login", json={"email": "hq@fieldpulse.dev", "password": "Password123!"})
hq_token = res.json()["access_token"]
hq_headers = {"Authorization": f"Bearer {hq_token}"}
print("HQ Login OK")

print("\n2. Creating a project...")
res = requests.post(f"{BASE_URL}/projects", json={
    "name": "E2E Test Project",
    "location_lat": 26.1,
    "location_lng": 91.7,
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-12-31T00:00:00Z"
}, headers=hq_headers)
project_id = res.json()["id"]
print(f"Project created: {project_id}")

print("\n3. Bulk-add schedule activities...")
activities = [{"activity_code": f"ACT-{i}", "activity_name": f"Task {i}", "planned_start": "2024-01-01T00:00:00Z", "planned_end": "2024-01-05T00:00:00Z"} for i in range(10)]
res = requests.post(f"{BASE_URL}/projects/{project_id}/schedule/bulk", json={"activities": activities}, headers=hq_headers)
print("Bulk schedule OK:", res.json())

print("\n4. Invite PM...")
res = requests.post(f"{BASE_URL}/projects/{project_id}/managers", json={"email": "newpm@test.com", "name": "New PM"}, headers=hq_headers)
invite_token = res.json()["invite_token"]
print("PM Invited, token:", invite_token)

print("\n5. Set PM Password & Login...")
res = requests.post(f"{BASE_URL}/auth/set-password", json={"invite_token": invite_token, "password": "NewPassword123!"})
pm_token = res.json()["access_token"]
pm_headers = {"Authorization": f"Bearer {pm_token}"}
print("PM Password Set & Logged In")

print("\n6. PM adds Engineer to roster...")
test_phone = "+919999999999"
res = requests.post(f"{BASE_URL}/projects/{project_id}/engineers", json={"phone": test_phone, "name": "Test Eng"}, headers=pm_headers)
print("Engineer added to roster:", res.json())

print("\n7. Attempt OTP with UNLISTED phone...")
res = requests.post(f"{BASE_URL}/auth/otp/request", json={"phone": "+910000000000"})
print("Status Code (expect 403):", res.status_code)
print("Response:", res.json())

print("\n8. Attempt OTP with LISTED phone...")
res = requests.post(f"{BASE_URL}/auth/otp/request", json={"phone": test_phone})
print("OTP Request Status:", res.status_code)

# We can bypass actual OTP sending because send_otp just prints to console for now, and verify_otp accepts "123456" as a mock if not implemented (wait, I should check otp_provider.py)
