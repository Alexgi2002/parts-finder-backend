# 🛠️ Web Scraping API para Tiendas de Piezas

[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express)](https://expressjs.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)

Una API RESTful construida con Node.js que realiza web scraping a múltiples tiendas de piezas y componentes electrónicos, consolidando los resultados en un único endpoint.

## ✨ Características

- **🔍 Búsqueda Unificada**: Consulta múltiples tiendas simultáneamente
- **⚡ Alto Rendimiento**: Procesamiento asíncrono y paralelo
- **📦 Resultados Estandarizados**: Formato consistente para todos los productos
- **🔒 CORS Habilitado**: Listo para consumo desde frontend
- **🎯 Escalable**: Arquitectura modular para añadir nuevas tiendas fácilmente
- **⏱️ Timeouts Configurables**: Control de tiempos de respuesta

## 🚀 Instalación

### Prerrequisitos

- Node.js 16+
- npm o yarn

### Pasos de instalación

1. **Clonar el repositorio**

```bash
git clone https://github.com/AlexGI2002/parts-finder-backend.git
cd tu-repositorio
```

2. **Instalar dependencias**

```bash
npm install
```

4. **Ejecutar en desarrollo**

```bash
npm run dev
```

5. **Ejecutar en producción**

```bash
npm start
```

## 📡 Uso de la API

### Endpoint de Búsqueda

```http
GET /search?q={query}
```

#### Parámetros

- `q` (requerido): Término de búsqueda (URL encoded)

#### Ejemplo de solicitud

```bash
curl "http://localhost:3000/search?q=arduino
```

```


## 🐛 Solución de Problemas Comunes

### Error: Timeout en algunas tiendas
```javascript
// Aumentar timeout en la configuración
const config = {
  timeout: 15000,
  // ... otras configs
}
```

### Error: Estructura HTML cambiada

Actualizar los selectores en el scraper específico de la tienda.

### Error: Bloqueo por IP

Implementar rotación de proxies o reducir la frecuencia de requests.

## 📦 Despliegue

### Opción 1: Docker

```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit tus cambios: `git commit -m 'Añadir nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

## ⚠️ Consideraciones Legales y Éticas

Este proyecto es para fines educativos y de demostración. Antes de usar en producción:

- ✅ Revisar el `robots.txt` de cada sitio web
- ✅ Respetar los términos de servicio
- ✅ Implementar delays entre requests (≥ 2 segundos)
- ✅ Considerar usar APIs oficiales cuando estén disponibles
- ✅ Usar headers realistas y identificarse apropiadamente

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

Si encuentras algún problema o tienes preguntas:

1. Revisa los [issues existentes](https://github.com/AlexGI2002/parts-finder-backend/issues)
2. Crea un nuevo issue con detalles del problema
3. Proporciona logs y ejemplos cuando sea posible

## 📊 Estadísticas

![Estado del Proyecto](https://img.shields.io/badge/status-active-brightgreen)
![Último Commit](https://img.shields.io/github/last-commit/AlexGI2002/parts-finder-backend/)
![Versión](https://img.shields.io/github/package-json/v/AlexGI2002/parts-finder-backend/)

---

**Disclaimer**: Este proyecto es para fines educativos. El web scraping puede violar los términos de servicio de algunos sitios web. Úsalo responsablemente y consulta con un abogado si planeas usarlo comercialmente.
