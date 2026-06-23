from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.user import User
from ..models.store import Store
from ..models.order import Order as OrderModel
from ..models.product import Product
from ..models.delivery_code import DeliveryCode
from ..schemas.user import UserUpdate, UserRole
from ..schemas.store import StoreCreate, StoreResponse
from ..schemas.order import Order as OrderSchema
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/seller", tags=["seller"])

@router.post("/become-seller")
def become_seller(
    store_data: StoreCreate,
    current_user_email: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permite a un usuario normal convertirse en vendedor creando una tienda"""
    user = db.query(User).filter(User.email == current_user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Verificar si el usuario ya tiene una tienda
    existing_store = db.query(Store).filter(Store.user_id == user.id).first()
    if existing_store:
        raise HTTPException(status_code=400, detail="El usuario ya tiene una tienda")
    
    # Crear la tienda
    store_data_dict = store_data.dict()
    store_data_dict['user_id'] = user.id
    
    new_store = Store(**store_data_dict)
    db.add(new_store)
    
    # Actualizar el rol del usuario
    if user.role == UserRole.BUYER:
        user.role = UserRole.BOTH
    elif user.role == UserRole.SELLER:
        user.role = UserRole.BOTH
    
    db.commit()
    db.refresh(new_store)
    
    return {"message": "Tienda creada exitosamente", "store": StoreResponse.model_validate(new_store)}

@router.put("/switch-role")
def switch_role(
    role: str,
    current_user_email: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permite cambiar entre rol de comprador y vendedor"""
    user = db.query(User).filter(User.email == current_user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Verificar que el usuario tenga el rol BOTH
    if user.role != UserRole.BOTH:
        raise HTTPException(status_code=400, detail="Solo usuarios con rol BOTH pueden cambiar de rol")
    
    # Cambiar el rol activo
    if role == "buyer":
        user.role = UserRole.BUYER
    elif role == "seller":
        user.role = UserRole.SELLER
    else:
        raise HTTPException(status_code=400, detail="Rol inválido. Use 'buyer' o 'seller'")
    
    db.commit()
    db.refresh(user)
    
    return {"message": f"Rol cambiado a {role}", "role": user.role}

@router.get("/my-store")
def get_my_store(
    current_user_email: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene la tienda del usuario actual"""
    user = db.query(User).filter(User.email == current_user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    store = db.query(Store).filter(Store.user_id == user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="El usuario no tiene una tienda")
    
    return StoreResponse.model_validate(store)


@router.get("/orders", response_model=List[OrderSchema])
def get_seller_orders(
    current_user_email: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener los pedidos que contienen productos de la tienda del vendedor"""
    user = db.query(User).filter(User.email == current_user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    store = db.query(Store).filter(Store.user_id == user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="No tienes una tienda registrada")
        
    store_products = db.query(Product).filter(Product.store_id == store.id).all()
    product_ids = [p.id for p in store_products]
    
    if not product_ids:
        return []
        
    all_orders = db.query(OrderModel).order_by(OrderModel.created_at.desc()).all()
    
    seller_orders = []
    for order in all_orders:
        order_products = order.products or []
        has_seller_product = any(
            p.get("productId") in product_ids for p in order_products
        )
        if has_seller_product:
            order.delivery_code = None  # type: ignore
            order.client_name = order.user.name if order.user else None  # type: ignore
            order.client_email = order.user.email if order.user else None  # type: ignore
            seller_orders.append(order)
            
    return seller_orders


@router.put("/orders/{order_id}/cancel")
def cancel_seller_order(
    order_id: int,
    current_user_email: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permite a un vendedor cancelar un pedido que contenga sus productos"""
    from datetime import datetime

    user = db.query(User).filter(User.email == current_user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    store = db.query(Store).filter(Store.user_id == user.id).first()
    if not store:
        raise HTTPException(status_code=404, detail="No tienes una tienda registrada")
        
    order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
        
    # Verificar si el pedido contiene algún producto de la tienda del vendedor
    store_products = db.query(Product).filter(Product.store_id == store.id).all()
    product_ids = [p.id for p in store_products]
    
    order_products = order.products or []
    has_seller_product = any(
        p.get("productId") in product_ids for p in order_products
    )
    
    if not has_seller_product:
        raise HTTPException(status_code=403, detail="No tienes permiso para cancelar este pedido")
        
    # Cancelar el pedido
    order.status = "canceled"
    order.updated_at = datetime.utcnow()
    
    # Desactivar chats activos asociados a este pedido
    from ..models.chat import Chat
    active_chats = db.query(Chat).filter(Chat.order_id == order_id, Chat.is_active == True).all()
    for chat in active_chats:
        chat.is_active = False
        
    db.commit()
    
    return {"message": "Pedido cancelado exitosamente", "status": order.status}

