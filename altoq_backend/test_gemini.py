import requests
import json
from dotenv import load_dotenv
import os

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
print(f"API Key found: {bool(api_key)}")

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

body = {
    "system_instruction": {
        "parts": [{"text": "Eres un asistente amigable que ayuda a crear tiendas. Responde en JSON con: response, name, description, ruc, contact, email, is_complete"}]
    },
    "contents": [
        {"role": "user", "parts": [{"text": "Hola, quiero crear mi tienda de ropa"}]}
    ],
    "generationConfig": {
        "responseMimeType": "application/json",
        "responseSchema": {
            "type": "OBJECT",
            "properties": {
                "response": {"type": "STRING"},
                "name": {"type": "STRING", "nullable": True},
                "description": {"type": "STRING", "nullable": True},
                "ruc": {"type": "STRING", "nullable": True},
                "contact": {"type": "STRING", "nullable": True},
                "email": {"type": "STRING", "nullable": True},
                "is_complete": {"type": "BOOLEAN"}
            },
            "required": ["response", "is_complete"]
        },
        "temperature": 0.7
    }
}

resp = requests.post(url, json=body, headers={"Content-Type": "application/json"}, timeout=30)
print(f"Status: {resp.status_code}")

if resp.status_code == 200:
    data = resp.json()
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    parsed = json.loads(text)
    print("SUCCESS!")
    print(json.dumps(parsed, indent=2, ensure_ascii=False))
else:
    print(f"ERROR: {resp.text[:500]}")
