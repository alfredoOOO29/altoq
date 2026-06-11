import requests
import json
from pydantic import BaseModel, Field
from ..config import settings
import os

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

class StoreExtractionSchema(BaseModel):
    response: str = ""
    name: str | None = None
    description: str | None = None
    ruc: str | None = None
    contact: str | None = None
    email: str | None = None
    is_complete: bool = False

SYSTEM_PROMPT = (
    "Eres un asistente conversacional experto, amable y motivador llamado 'Asistente ALTOQ'. "
    "Tu objetivo es ayudar a los nuevos emprendedores a configurar su tienda en la plataforma ALTOQ. "
    "Debes tener una conversación fluida y natural para extraer la siguiente información de su negocio: "
    "Nombre de la tienda, Descripción/Nicho (qué venden), RUC (cadena de texto de 11 dígitos), Teléfono de contacto y Correo electrónico. "
    "Si el usuario te pide sugerencias de nombres o ideas, ayúdalo creativamente. "
    "Ve pidiendo los datos de uno en uno para no abrumar al usuario. "
    "Cuando tengas toda la información de los 5 campos, genera un resumen final para confirmar y cambia 'is_complete' a true. "
    "IMPORTANTE: Responde SIEMPRE en formato JSON con esta estructura exacta: "
    '{"response": "tu mensaje aquí", "name": "nombre o null", "description": "descripción o null", '
    '"ruc": "ruc o null", "contact": "teléfono o null", "email": "email o null", "is_complete": false}'
)

def process_store_chat(messages: list) -> StoreExtractionSchema:
    api_key = settings.gemini_api_key or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY no está configurada. Por favor añádela en el archivo .env")

    # Formatear mensajes para la API REST de Gemini
    contents = []
    for msg in messages:
        role = "model" if msg.get("role") == "assistant" else "user"
        contents.append({
            "role": role,
            "parts": [{"text": msg.get("content", "")}]
        })

    # Construir el body de la petición
    request_body = {
        "system_instruction": {
            "parts": [{"text": SYSTEM_PROMPT}]
        },
        "contents": contents,
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "response": {"type": "STRING", "description": "Respuesta amigable del asistente"},
                    "name": {"type": "STRING", "nullable": True, "description": "Nombre de la tienda"},
                    "description": {"type": "STRING", "nullable": True, "description": "Descripción/nicho de la tienda"},
                    "ruc": {"type": "STRING", "nullable": True, "description": "RUC de 11 dígitos"},
                    "contact": {"type": "STRING", "nullable": True, "description": "Teléfono de contacto"},
                    "email": {"type": "STRING", "nullable": True, "description": "Correo electrónico"},
                    "is_complete": {"type": "BOOLEAN", "description": "True si todos los datos están completos"}
                },
                "required": ["response", "is_complete"]
            },
            "temperature": 0.7
        }
    }

    try:
        resp = requests.post(
            f"{GEMINI_API_URL}?key={api_key}",
            json=request_body,
            headers={"Content-Type": "application/json"},
            timeout=30
        )

        if resp.status_code != 200:
            error_msg = resp.text[:500]
            print(f"Gemini API error {resp.status_code}: {error_msg}")
            raise Exception(f"Gemini API respondió con status {resp.status_code}: {error_msg}")

        data = resp.json()
        # Extraer el texto de la respuesta
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        result_dict = json.loads(text)
        return StoreExtractionSchema(**result_dict)

    except requests.exceptions.RequestException as e:
        print(f"Error de red con Gemini API: {e}")
        return StoreExtractionSchema(
            response="Lo siento, tuve un problema de conexión. ¿Podrías intentar de nuevo?",
        )
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        print(f"Error parseando respuesta de Gemini: {e}")
        return StoreExtractionSchema(
            response="Lo siento, tuve un problema procesando la información. ¿Podrías repetirlo?",
        )
