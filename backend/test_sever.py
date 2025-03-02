import requests

url = "http://127.0.0.1:8000/questions"

try:
    response = requests.get(url, timeout=10)
    response.raise_for_status()  # Vérifie si le serveur renvoie une erreur HTTP
    print(response.json())  # Affiche la réponse
except requests.ConnectionError as e:
    print(f"Erreur de connexion : {e}")
except requests.Timeout:
    print("Le serveur met trop de temps à répondre.")
except requests.RequestException as e:
    print(f"Erreur inconnue : {e}")
