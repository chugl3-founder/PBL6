import os
import psycopg2

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

env = load_env('.env')
db_url = env.get('SPRING_DATASOURCE_URL', '')
db_user = env.get('SPRING_DATASOURCE_USERNAME', '')
db_pass = env.get('SPRING_DATASOURCE_PASSWORD', '')

if db_url.startswith('jdbc:'):
    db_url = db_url[5:]

print('Connecting to Supabase PostgreSQL...')
conn = psycopg2.connect(db_url, user=db_user, password=db_pass)
cur = conn.cursor()

with open('ai-rag-coach/schema.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

cur.execute(sql)
conn.commit()
print('SUCCESS: schema.sql executed successfully!')

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_name IN ('knowledge_embeddings', 'chat_sessions', 'chat_messages');")
print('Created Tables:', cur.fetchall())

cur.execute("SELECT routine_name FROM information_schema.routines WHERE routine_name = 'match_knowledge';")
print('Created Functions:', cur.fetchall())

cur.close()
conn.close()
