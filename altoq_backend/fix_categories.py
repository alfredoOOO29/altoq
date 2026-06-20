from app.database import SessionLocal
from app.models.product import Product
from app.models.category import Category

db = SessionLocal()

products = db.query(Product).filter(Product.category_id == None).all()
for p in products:
    if p.category:
        slug = p.category.lower().replace(" ", "-")
        cat_obj = db.query(Category).filter(
            (Category.slug == slug) | (Category.name.ilike(f"%{p.category}%"))
        ).first()
        if cat_obj:
            p.category_id = cat_obj.id
            print(f"Updated product {p.id} ({p.name}) to category_id {cat_obj.id}")

db.commit()
print("Done fixing categories.")
