import hmac
import hashlib
import base64
import json
import time
import os
from typing import Optional, Dict, Any

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

secret_b64 = env.get('JWT_SECRET', '404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970')
try:
    jwt_key_bytes = base64.b64decode(secret_b64)
except Exception:
    jwt_key_bytes = secret_b64.encode('utf-8')

def decode_and_verify_token(token: Any) -> Optional[Dict[str, Any]]:
    """
    Xác thực và giải mã JWT token từ Spring Boot Backend.
    Hỗ trợ chuẩn HMAC (HS384 / HS256 / HS512) và kiểm tra hạn sử dụng.
    """
    if not token or not isinstance(token, str):
        return None
        
    token = token.strip()
    if token.lower().startswith('bearer '):
        token = token[7:].strip()
        
    parts = token.split('.')
    if len(parts) != 3:
        return None
        
    header_b64, payload_b64, sig_b64 = parts
    
    try:
        # 1. Giải mã header để xác định thuật toán ký
        rem = len(header_b64) % 4
        padded_header = header_b64 + ('=' * (4 - rem) if rem else '')
        header = json.loads(base64.urlsafe_b64decode(padded_header).decode('utf-8'))
        
        alg = header.get('alg', 'HS384')
        if alg == 'HS384':
            hasher = hashlib.sha384
        elif alg == 'HS512':
            hasher = hashlib.sha512
        else:
            hasher = hashlib.sha256
            
        # 2. Xác thực chữ ký HMAC
        signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_sig = hmac.new(jwt_key_bytes, signing_input, hasher).digest()
        
        rem_sig = len(sig_b64) % 4
        padded_sig = sig_b64 + ('=' * (4 - rem_sig) if rem_sig else '')
        actual_sig = base64.urlsafe_b64decode(padded_sig)
        
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
            
        # 3. Giải mã payload và kiểm tra hạn sử dụng (exp)
        rem_payload = len(payload_b64) % 4
        padded_payload = payload_b64 + ('=' * (4 - rem_payload) if rem_payload else '')
        payload = json.loads(base64.urlsafe_b64decode(padded_payload).decode('utf-8'))
        
        if payload.get('exp') and payload['exp'] < time.time():
            return None  # Token hết hạn
            
        return payload
    except Exception:
        return None
