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

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = load_env(os.path.join(root_dir, '.env'))

db_url = env.get('SPRING_DATASOURCE_URL', '')
if db_url.startswith('jdbc:'):
    db_url = db_url[5:]

conn = psycopg2.connect(db_url, user=env.get('SPRING_DATASOURCE_USERNAME'), password=env.get('SPRING_DATASOURCE_PASSWORD'))
cur = conn.cursor()

tables = ['matches', 'rallies', 'ai_events', 'match_statistics', 'player_profiles', 'scouting_reports']
for t in tables:
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = %s ORDER BY ordinal_position;", (t,))
    cols = [c[0] for c in cur.fetchall()]
    print(f"Table: {t} -> {cols}")

cur.close()
conn.close()
