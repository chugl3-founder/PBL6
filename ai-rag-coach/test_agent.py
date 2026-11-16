import os
from google import genai
from google.genai import types

def load_env(filepath):
    env_vars = {}
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env_vars[k.strip()] = v.strip()
    return env_vars

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = load_env(os.path.join(root_dir, '.env'))

client = genai.Client(api_key=env.get('GEMINI_API_KEY'))

# Khai báo test function
def get_match_info(match_id: int) -> dict:
    """Lấy thông tin tổng quan của một trận đấu cầu lông theo match_id."""
    return {
        "match_id": match_id,
        "title": "Chung kết Đơn Nam",
        "player_a": "Nguyễn Văn A",
        "player_b": "Trần Văn B",
        "score": "21-19, 18-21, 21-15",
        "total_smash_count": 42
    }

response = client.models.generate_content(
    model='gemini-2.5-flash' if 'gemini-2.5-flash' in [m.name for m in client.models.list()] else 'gemini-2.0-flash',
    contents='Cho tôi biết kết quả và số cú smash của trận đấu số 9?',
    config=types.GenerateContentConfig(
        tools=[get_match_info],
        temperature=0.2
    )
)

print("Agent response:", response.text)
