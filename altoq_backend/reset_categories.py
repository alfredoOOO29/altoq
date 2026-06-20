from app.database import SessionLocal
from app.models.category import Category
from app.models.product import Product

db = SessionLocal()

# 1. Encontrar o crear "Comida"
comida_cat = db.query(Category).filter(
    (Category.slug == 'comida') | (Category.name.ilike('%comida%'))
).first()

if not comida_cat:
    comida_cat = Category(
        name="Comida", 
        slug="comida", 
        description="Alimentos, postres y restaurantes", 
        icon="🍔"
    )
    db.add(comida_cat)
    db.commit()
    db.refresh(comida_cat)

comida_id = comida_cat.id

# 2. Borrar las demás categorías
other_cats = db.query(Category).filter(Category.id != comida_id).all()
for cat in other_cats:
    print(f"Borrando categoría: {cat.name}")
    db.delete(cat)
db.commit()

# 3. Agregar nuevas categorías para el marketplace
nuevas_categorias = [
    {"name": "Ropa y Moda", "slug": "ropa-y-moda", "description": "Prendas de vestir, calzado y accesorios", "icon": "👕"},
    {"name": "Electrónica", "slug": "electronica", "description": "Celulares, computadoras y gadgets", "icon": "📱"},
    {"name": "Hogar y Jardín", "slug": "hogar-y-jardin", "description": "Muebles, decoración y herramientas", "icon": "🏠"},
    {"name": "Salud y Belleza", "slug": "salud-y-belleza", "description": "Cuidado personal, maquillaje y perfumes", "icon": "💄"},
    {"name": "Deportes", "slug": "deportes", "description": "Ropa deportiva, bicicletas y accesorios", "icon": "⚽"},
    {"name": "Juguetes", "slug": "juguetes", "description": "Juguetes para niños y juegos de mesa", "icon": "🧸"},
    {"name": "Libros", "slug": "libros", "description": "Novelas, textos académicos y cómics", "icon": "📚"}
]

for cat_data in nuevas_categorias:
    existing = db.query(Category).filter(Category.slug == cat_data["slug"]).first()
    if not existing:
        new_cat = Category(**cat_data)
        db.add(new_cat)
        print(f"Creada categoría: {new_cat.name}")

db.commit()

# 4. Reasignar category_id a productos huérfanos basándonos en su texto 'category'
all_products = db.query(Product).filter(Product.category_id == None).all()
all_cats = db.query(Category).all()

for p in all_products:
    if p.category:
        slug_text = p.category.lower().replace(" ", "-")
        # Find best match
        best_cat = None
        for c in all_cats:
            if c.slug in slug_text or slug_text in c.slug:
                best_cat = c
                break
            # extra fallback for keyword matching
            if p.category.lower() in c.name.lower():
                best_cat = c
                break
        
        if best_cat:
            p.category_id = best_cat.id
            print(f"Producto '{p.name}' reasignado a '{best_cat.name}'")

db.commit()
print("¡Categorías actualizadas con éxito!")
