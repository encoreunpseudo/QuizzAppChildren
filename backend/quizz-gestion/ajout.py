import sqlite3

def creer_connection(db_file):
    """Create a database connection to the SQLite database specified by db_file."""
    conn = None
    try:
        conn = sqlite3.connect(db_file)
    except sqlite3.Error as e:
        print(e)
    return conn
def ajouter_questions(*questions):
    """Ajouter des questions à la base de données."""
    conn = creer_connection('/Users/ameltebboune/Desktop/Projets/APP/mon-app-mobile/backend/database/Quizz.db')
    cursor = conn.cursor()
    for question in questions:
        cursor.execute('''
        INSERT INTO quizz (theme, question, rep1, rep2, rep3, bonne_rep)
        VALUES (?, ?, ?, ?, ?, ?)
        ''', question)
    conn.commit()
    conn.close()



