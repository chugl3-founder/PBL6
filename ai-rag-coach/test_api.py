import requests
import json

payload = {
    "message": "Phân tích giúp tôi trận đấu số 2?",
    "match_id": 2
}

resp = requests.post("http://localhost:8000/api/chat", json=payload)
print("Status code:", resp.status_code)
data = resp.json()
print("Session ID:", data.get("session_id"))
print("Reply excerpt:", data.get("reply", "")[:300])
print("Video citations:", data.get("video_citations"))
