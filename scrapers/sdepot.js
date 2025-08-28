const puppeteer = require('puppeteer');
const Product = require('../models/Product'); // Asegúrate de tener la ruta correcta

async function scrapeSdepot(searchQuery = '', pageNumber = 1) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 600000
    });
    
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        // Construir URL con parámetros
        const url = `https://sdepot.com/search.php?page=${pageNumber}&section=product&search_query=${encodeURIComponent(searchQuery)}`;
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Esperar a que los productos carguen
        await page.waitForSelector('.productCards.productCards--grid', { timeout: 0 });
        
        // Extraer datos de los productos usando el modelo
        const products = await page.evaluate(() => {
            const productCards = Array.from(document.querySelectorAll('.productCard.productCard--grid'));
            
            return productCards.map(card => {
                const titleElement = card.querySelector('.card-title a');
                const skuElement = card.querySelector('.card-text.card-text--sku');
                const brandElement = card.querySelector('.card-text.card-text--brand');
                const imageElement = card.querySelector('.card-image');
                const linkElement = card.querySelector('.card-title a');
                const priceElement = card.querySelector('.card-text.card-text--price');
                
                // Mapeamos los datos al modelo Product
                return {
                    name: titleElement ? titleElement.textContent.trim() : '',
                    sku: skuElement ? skuElement.textContent.replace('SKU:', '').trim() : '',
                    price: priceElement ? priceElement.textContent.trim() : 'Log in for pricing',
                    image: imageElement ? imageElement.src : '',
                    link: linkElement ? linkElement.href : '',
                    site: 'SDEPOT',
                    manufacturer: brandElement ? brandElement.textContent.trim() : ''
                };
            });
        });

        // Crear instancias del modelo Product
        const productInstances = products.map(data => new Product(data));

        console.log('Terminado de extraer productos de SDEPOT');

        return {
            page: pageNumber,
            query: searchQuery,
            products: productInstances,
            url
        };

    } catch (error) {
        console.error('Error during scraping SDEPOT:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

// Ejemplo de uso
// scrapeSdepot('door', 3).then(console.log).catch(console.error);

module.exports = scrapeSdepot;