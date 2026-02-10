import requests
import json
import time
import sys

url = "http://127.0.0.1:8000/scan/email"

payload = {
    "headers": "Subject: URGENT VERIFY",
    "body_text": "URGENT: Your account is suspended. Click here to verify your identity immediately or you will lose access.",
    "urls": ["http://evil-phishing-site.com/login"],
    "sender": "support@paypal-security-alert.com"
}

print("Waiting for server to start (300s timeout)...")
start_ts = time.time()
# Wait up to 300 seconds (5 mins) for model download
while time.time() - start_ts < 300:
    try:
        response = requests.get("http://127.0.0.1:8000/health", timeout=2)
        if response.status_code == 200:
            print("Server is up!")
            break
    except:
        time.sleep(5)
        print(f"Waiting... ({int(time.time() - start_ts)}s)")
else:
    print("Server failed to start in time (300s). Check internet connection or logs.")
    sys.exit(1)

print("Sending scam test payload...")
try:
    response = requests.post(url, json=payload)
    print("Status Code:", response.status_code)
    print("Response JSON:", json.dumps(response.json(), indent=2))
except Exception as e:
    print("Request failed:", e)
