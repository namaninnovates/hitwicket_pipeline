import sqlite3
import psycopg2
from pathlib import Path
from src.config import DATABASE_URL, DB_PATH

def seed_master_dataset():
    if not DATABASE_URL or not DATABASE_URL.startswith("postgres"):
        print("DATABASE_URL is not set to PostgreSQL.")
        return

    sqlite_file = Path(__file__).resolve().parent.parent / "data" / "reviews.db"
    if not sqlite_file.exists():
        print(f"Local seed sqlite file not found at {sqlite_file}")
        return

    print("Connecting to local SQLite seed data...")
    s_conn = sqlite3.connect(str(sqlite_file))
    s_conn.row_factory = sqlite3.Row
    s_cur = s_conn.cursor()

    print("Connecting to Neon PostgreSQL...")
    p_conn = psycopg2.connect(DATABASE_URL)
    p_conn.autocommit = True
    p_cur = p_conn.cursor()

    # Fetch SQLite reviews
    s_cur.execute("SELECT * FROM reviews")
    reviews = s_cur.fetchall()
    print(f"Seeding {len(reviews)} master reviews...")

    id_map = {}
    for r in reviews:
        r_dict = dict(r)
        p_cur.execute("""
            INSERT INTO reviews (game, source, review_id, review_date, rating, review_text, app_version, thumbs_up, retrieved_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (source, review_id) DO UPDATE SET
                rating = EXCLUDED.rating,
                review_text = EXCLUDED.review_text
            RETURNING id;
        """, (
            r_dict['game'], r_dict['source'], r_dict['review_id'], r_dict['review_date'],
            r_dict['rating'], r_dict['review_text'], r_dict.get('app_version'),
            r_dict.get('thumbs_up', 0), r_dict['retrieved_at']
        ))
        new_id = p_cur.fetchone()[0]
        id_map[r_dict['id']] = new_id

    # Fetch SQLite classifications
    s_cur.execute("SELECT * FROM classifications")
    classifications = s_cur.fetchall()
    print(f"Seeding {len(classifications)} master classifications...")

    for c in classifications:
        c_dict = dict(c)
        old_r_id = c_dict['review_db_id']
        if old_r_id in id_map:
            new_r_id = id_map[old_r_id]
            p_cur.execute("""
                INSERT INTO classifications 
                (review_db_id, primary_category, subcategory, sentiment, severity, business_impact, issue, actionability, confidence, model_used, classified_at, classification_raw)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (review_db_id) DO NOTHING;
            """, (
                new_r_id, c_dict['primary_category'], c_dict['subcategory'], c_dict['sentiment'],
                c_dict['severity'], c_dict['business_impact'], c_dict['issue'], c_dict['actionability'],
                c_dict['confidence'], c_dict['model_used'], c_dict['classified_at'], c_dict.get('classification_raw')
            ))

    print("Master review dataset successfully seeded to Neon PostgreSQL!")

if __name__ == "__main__":
    seed_master_dataset()
