from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class OrderItem(BaseModel):
    productId: int
    quantity: int
    price: float

class OrderBase(BaseModel):
    user_id: int
    products: List[OrderItem]
    total_amount: float
    status: str = "pending"
    shipping_address: str = ""
    contact_phone: str = ""

class OrderCreate(OrderBase):
    pass

class OrderResponse(OrderBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    delivery_code: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None

    class Config:
        from_attributes = True

class Order(OrderBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    delivery_code: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None

    class Config:
        from_attributes = True
