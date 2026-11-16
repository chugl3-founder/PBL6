import os
import psycopg2
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

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env = load_env(os.path.join(root_dir, '.env'))
    
    client = genai.Client(api_key=env.get('GEMINI_API_KEY'))
    
    queries = [
        "Luật giao cầu trong môn cầu lông quy định thế nào?",
        "Làm sao để phòng ngừa chấn thương khớp gối khi chơi cầu lông?",
        "Chiến thuật khai thác điểm yếu của đối thủ trong đánh đơn?"
    ]
    
    db_url = env.get('SPRING_DATASOURCE_URL', '')
    if db_url.startswith('jdbc:'):
        db_url = db_url[5:]
        
    conn = psycopg2.connect(db_url, user=env.get('SPRING_DATASOURCE_USERNAME'), password=env.get('SPRING_DATASOURCE_PASSWORD'))
    cur = conn.cursor()
    
    for q in queries:
        print("=" * 60)
        print(f"🔍 CÂU HỎI: {q}")
        print("=" * 60)
        
        resp = client.models.embed_content(
            model='gemini-embedding-001',
            contents=q,
            config=types.EmbedContentConfig(output_dimensionality=768)
        )
        query_vec = "[" + ",".join(map(str, resp.embeddings[0].values)) + "]"
        
        cur.execute("SELECT category, source_file, content, similarity FROM match_knowledge(%s::vector, 0.4, 2);", (query_vec,))
        rows = cur.fetchall()
        for idx, r in enumerate(rows):
            print(f"👉 Kết quả #{idx+1} [{r[0]}] - File: {r[1]} (Độ khớp: {r[3]*100:.1f}%):")
            print(f"   {r[2][:200].strip()}...\n")
            
    cur.close()
    conn.close()

if __name__ == '__main__':
    main()
