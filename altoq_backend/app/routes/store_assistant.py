from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any
from ..utils.gemini_assistant import process_store_chat, StoreExtractionSchema

router = APIRouter(prefix="/api/store-assistant", tags=["store-assistant"])

class ChatMessage(BaseModel):
    sender: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

@router.post("/chat", response_model=StoreExtractionSchema)
def store_assistant_chat(request: ChatRequest):
    """
    Recibe el historial de chat del asistente de creación de tiendas,
    lo procesa con Gemini y devuelve la respuesta junto con los datos extraídos.
    """
    try:
        # Convertir mensajes al formato esperado por la utilidad (role, content)
        messages_dict = [{"role": "assistant" if msg.sender == "assistant" else "user", "content": msg.content} for msg in request.messages]
        result = process_store_chat(messages_dict)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=500, detail=str(ve))
    except Exception as e:
        print(f"Error en store_assistant_chat: {e}")
        raise HTTPException(status_code=500, detail="Error procesando la solicitud con la IA")
