from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DeliveryCodeResponse(BaseModel):
    id: int
    order_id: int
    code: str
    is_used: Optional[bool] = False
    used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DeliveryValidation(BaseModel):
    code: str
    order_id: Optional[int] = None
