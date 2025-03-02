import fastapi
import uvicorn
import json
from pydantic import BaseModel
import random
from typing import Dict
from fastapi.middleware.cors import CORSMiddleware


class Quizz(BaseModel):
    id: int
    theme: str
    question: str
    answers: Dict[str, str]  # Un dictionnaire avec des clés "A", "B", "C", etc.
    correct_answer: str  # La bonne réponse (ex: "A")


app = fastapi.FastAPI()

# Configuration du CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Autorise toutes les origines (remplace "*" par ton IP si besoin)
    allow_credentials=True,
    allow_methods=["*"],  # Autorise toutes les méthodes HTTP (GET, POST, etc.)
    allow_headers=["*"],  # Autorise tous les headers
)

@app.get("/questions")
def get_feed():
    
    with open('database/questions.json', 'r') as file:
        questions = json.load(file)
    n=len(questions)
    N=5
    questions = random.sample(questions, n)
    return [Quizz(**question) for question in questions]




