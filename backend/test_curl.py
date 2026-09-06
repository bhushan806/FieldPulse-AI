import urllib.request
import urllib.error
import json

data = json.dumps({"email": "hq@fieldpulse.dev", "password": "Password123!"}).encode('utf-8')
req = urllib.request.Request("http://localhost:8000/api/auth/login", data=data, headers={"Content-Type": "application/json"})

try:
    with urllib.request.urlopen(req) as f:
        print("Response:", f.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("Error:", e.code, e.read().decode('utf-8'))
except Exception as e:
    print("Error:", str(e))
