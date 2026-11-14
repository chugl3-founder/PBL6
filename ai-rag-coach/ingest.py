import os
import time
import json
import psycopg2
from psycopg2.extras import execute_values
from pypdf import PdfReader
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

def chunk_text(text, max_chars=1000, overlap=120):
    """Cắt text thành các chunk có kích thước hợp lý, giữ nguyên câu."""
    paragraphs = text.split('\n')
    chunks = []
    current_chunk = ""
    
    for p in paragraphs:
        p = p.strip()
        if not p:
            continue
        if len(current_chunk) + len(p) <= max_chars:
            current_chunk += ("\n" + p if current_chunk else p)
        else:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = current_chunk[-overlap:] + " " + p if len(current_chunk) > overlap else p
            
    if current_chunk and len(current_chunk.strip()) > 30:
        chunks.append(current_chunk)
    return chunks

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(root_dir, '.env')
    env = load_env(env_path)
    
    api_key = env.get('GEMINI_API_KEY') or os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("[LỖI] Chưa tìm thấy GEMINI_API_KEY trong file .env!")
        return

    # Khởi tạo Gemini Client
    client = genai.Client(api_key=api_key)
    
    # Kết nối Database Supabase
    db_url = env.get('SPRING_DATASOURCE_URL', '')
    if db_url.startswith('jdbc:'):
        db_url = db_url[5:]
    db_user = env.get('SPRING_DATASOURCE_USERNAME', '')
    db_pass = env.get('SPRING_DATASOURCE_PASSWORD', '')
    
    print("[1/3] Đang kết nối tới Supabase PostgreSQL...")
    conn = psycopg2.connect(db_url, user=db_user, password=db_pass)
    cur = conn.cursor()
    
    # Xóa dữ liệu cũ nếu muốn ingest lại từ đầu
    cur.execute("SELECT count(*) FROM knowledge_embeddings;")
    existing_count = cur.fetchone()[0]
    if existing_count > 0:
        print(f" -> Đang xóa {existing_count} bản ghi vector cũ để nạp mới hoàn toàn...")
        cur.execute("TRUNCATE TABLE knowledge_embeddings;")
        conn.commit()

    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    categories = {
        '01_rules': 'rules',
        '02_tactics': 'tactics',
        '03_techniques': 'techniques',
        '04_fitness_injury': 'fitness_injury'
    }
    
    all_chunks = []
    print("\n[2/3] Đang đọc và phân đoạn toàn bộ tài liệu PDF...")
    
    for folder_name, cat in categories.items():
        folder_path = os.path.join(data_dir, folder_name)
        if not os.path.exists(folder_path):
            continue
        for fname in sorted(os.listdir(folder_path)):
            if fname.lower().endswith('.pdf'):
                fpath = os.path.join(folder_path, fname)
                print(f" -> Đang đọc file: [{cat}] {fname}")
                try:
                    reader = PdfReader(fpath)
                    file_chunks = 0
                    for page_num, page in enumerate(reader.pages):
                        page_text = page.extract_text() or ""
                        if len(page_text.strip()) < 40:
                            continue
                        page_chunks = chunk_text(page_text)
                        for c_idx, c_text in enumerate(page_chunks):
                            all_chunks.append({
                                'category': cat,
                                'source_file': fname,
                                'content': c_text,
                                'metadata': {'page': page_num + 1, 'chunk_index': c_idx}
                            })
                            file_chunks += 1
                    print(f"    + Đã tạo {file_chunks} chunks.")
                except Exception as e:
                    print(f"    [CẢNH BÁO] Lỗi đọc file {fname}: {e}")
                    
    print(f"\n=> TỔNG CỘNG: {len(all_chunks)} chunks cần sinh Vector.")
    print("\n[3/3] Đang sinh Embeddings bằng gemini-embedding-001 (768 dim) và lưu vào Supabase...")
    
    batch_size = 20
    inserted_count = 0
    start_time = time.time()
    
    for i in range(0, len(all_chunks), batch_size):
        batch = all_chunks[i:i + batch_size]
        texts = [b['content'] for b in batch]
        
        success = False
        retries = 3
        while retries > 0 and not success:
            try:
                response = client.models.embed_content(
                    model="gemini-embedding-001",
                    contents=texts,
                    config=types.EmbedContentConfig(output_dimensionality=768)
                )
                
                records_to_insert = []
                for item, emb_obj in zip(batch, response.embeddings):
                    vector_str = "[" + ",".join(map(str, emb_obj.values)) + "]"
                    records_to_insert.append((
                        item['category'],
                        item['source_file'],
                        item['content'],
                        vector_str,
                        json.dumps(item['metadata'])
                    ))
                    
                execute_values(
                    cur,
                    """
                    INSERT INTO knowledge_embeddings (category, source_file, content, embedding, metadata)
                    VALUES %s
                    """,
                    records_to_insert,
                    template="(%s, %s, %s, %s::vector, %s::jsonb)"
                )
                conn.commit()
                inserted_count += len(batch)
                percent = (inserted_count / len(all_chunks)) * 100
                print(f"  * Tiến độ: {inserted_count}/{len(all_chunks)} ({percent:.1f}%) | Đã nạp batch {i // batch_size + 1}")
                success = True
                time.sleep(0.5)
            except Exception as ex:
                retries -= 1
                print(f"  [TẠM DỪNG] Lỗi batch {i}: {ex}. Thử lại sau 3s (Còn {retries} lần)...")
                time.sleep(3)
                
    elapsed = time.time() - start_time
    cur.close()
    conn.close()
    print(f"\n🎉 THÀNH CÔNG RỰC RỠ!")
    print(f"Đã nạp thành công {inserted_count} vector tri thức vào Supabase trong {elapsed:.1f} giây.")

if __name__ == '__main__':
    main()
