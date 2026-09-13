import asyncio
import os
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://127.0.0.1:8000/api"

def run_test():
    print("=" * 60)
    print("STEP 1: Authenticating Site Engineer (+919876543210)...")
    print("=" * 60)
    # Send OTP request
    req_res = requests.post(f"{BASE_URL}/auth/otp/request", json={"phone": "+919876543210"})
    print("Request OTP:", req_res.status_code, req_res.json())

    # Verify OTP (mock mode accepts 123456)
    verify_res = requests.post(f"{BASE_URL}/auth/otp/verify", json={"phone": "+919876543210", "code": "123456"})
    print("Verify OTP:", verify_res.status_code)
    eng_token = verify_res.json()["access_token"]
    eng_headers = {"Authorization": f"Bearer {eng_token}"}
    print("Site Engineer Authenticated successfully!")

    print("\n" + "=" * 60)
    print("STEP 2: Fetching Project & Activities BEFORE Upload...")
    print("=" * 60)
    # PM login to check PM perspective
    pm_res = requests.post(f"{BASE_URL}/auth/login", json={"email": "pm@fieldpulse.ai", "password": "FieldPulse@123"})
    if pm_res.status_code != 200:
        pm_res = requests.post(f"{BASE_URL}/auth/login", json={"email": "pm@fieldpulse.dev", "password": "Password123!"})
    pm_token = pm_res.json()["access_token"]
    pm_headers = {"Authorization": f"Bearer {pm_token}"}

    project_id = "6a9a4ca203626c13e12295eb"

    # Check PM dashboard before
    dash_before = requests.get(f"{BASE_URL}/dashboard/{project_id}", headers=pm_headers).json()
    print(f"PM Dashboard BEFORE -> Progress: {dash_before.get('overall_progress')}% | Total Activities: {dash_before.get('total_activities')}")
    for act in dash_before.get("activities", []):
        print(f"  - Activity [{act.get('activity_code')}]: {act.get('activity_name')} -> {act.get('percent_complete')}% ({act.get('status')})")

    # Check Review queue before
    rq_before = requests.get(f"{BASE_URL}/review-queue/?project_id={project_id}", headers=pm_headers).json()
    print(f"PM Review Queue BEFORE: {len(rq_before)} items pending")

    print("\n" + "=" * 60)
    print("STEP 3: Uploading Dummy Photo (1_excavation_site.jpg) to AI...")
    print("=" * 60)
    photo_path = "../demo_photos/1_excavation_site.jpg"
    with open(photo_path, "rb") as f:
        files = {"file": ("1_excavation_site.jpg", f, "image/jpeg")}
        data = {
            "project_id": project_id,
            "media_type": "photo",
            "text_note": "Excavator digging trench for pipeline corridor Phase 1",
            "gps_lat": 27.47,
            "gps_lng": 94.92,
        }
        capture_res = requests.post(f"{BASE_URL}/captures/", data=data, files=files, headers=eng_headers)

    print("Capture Submission Status:", capture_res.status_code)
    cap_data = capture_res.json()
    print("\n--- AI PROCESSING RESULT ---")
    print(f"Capture ID: {cap_data.get('id')}")
    print(f"CV Classification: {cap_data.get('cv_classification')}")
    print(f"Extracted Entities: {cap_data.get('extracted_entities')}")
    print(f"Matched Activity ID: {cap_data.get('matched_activity_id')}")
    print(f"Confidence Score: {cap_data.get('confidence_score')}")
    print(f"Capture Status: {cap_data.get('status')}")
    print(f"Processing Notes: {cap_data.get('processing_notes')}")
    print(f"Media URL: {cap_data.get('media_url')}")

    print("\n" + "=" * 60)
    print("STEP 4: Checking PM Dashboard & Review Queue AFTER Upload...")
    print("=" * 60)
    dash_after = requests.get(f"{BASE_URL}/dashboard/{project_id}", headers=pm_headers).json()
    print(f"PM Dashboard AFTER -> Progress: {dash_after.get('overall_progress')}%")
    for act in dash_after.get("activities", []):
        print(f"  - Activity [{act.get('activity_code')}]: {act.get('activity_name')} -> {act.get('percent_complete')}% ({act.get('status')})")

    rq_after = requests.get(f"{BASE_URL}/review-queue/?project_id={project_id}", headers=pm_headers).json()
    print(f"PM Review Queue AFTER: {len(rq_after)} items pending")

    # Also check Time Machine timeline for the matched activity
    matched_act = cap_data.get('matched_activity_id')
    if matched_act:
        tm_res = requests.get(f"{BASE_URL}/activities/{matched_act}/timeline", headers=pm_headers)
        if tm_res.status_code == 200:
            events = tm_res.json().get("events", [])
            print(f"\nTime Machine Forensic Ledger for Matched Activity ({len(events)} events):")
            for ev in events[-3:]:
                print(f"  * [{ev.get('event_type')}] {ev.get('description')} (Hash: {ev.get('integrity_hash', '')[:12]}...)")

if __name__ == "__main__":
    run_test()
