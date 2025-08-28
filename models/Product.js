// models/Product.js
class Product {
  constructor({
    name,
    sku,
    price,
    image,
    link,
    site,
    availability,
    description,
    manufacturer
  }) {
    this.name = name || 'Nombre no disponible';
    this.sku = sku || 'SKU no disponible';
    this.price = price || 'Precio no disponible';
    this.image = image || '';
    this.link = link || '';
    this.site = site || 'Sitio desconocido';
    this.availability = availability || 'Disponibilidad no disponible';
    this.description = description || '';
    this.manufacturer = manufacturer || '';
  }
}

module.exports = Product;