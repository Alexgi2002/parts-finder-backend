const puppeteer = require('puppeteer');
const Product = require('../models/Product');

async function scrapeBannerSolutions(searchQuery = '') {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        const url = `https://www.bannersolutions.com/s/${encodeURIComponent(searchQuery)}`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Esperar a que los productos iniciales carguen
        await page.waitForSelector('.MuiGrid-container', { timeout: 15000 });
        
        // Función para hacer scroll y cargar más productos
        const scrollAndLoad = async () => {
            let productCount = 0;
            let previousCount = 0;
            const maxProducts = 50;
            let scrollAttempts = 0;
            const maxScrollAttempts = 10;
            
            while (productCount < maxProducts && scrollAttempts < maxScrollAttempts) {
                previousCount = productCount;
                
                // Obtener productos actuales
                productCount = await page.$$eval('.searchproductcss_card', cards => cards.length);
                
                // Hacer scroll al final de la página
                await page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                });
                
                // Esperar a que se carguen nuevos productos
                await new Promise(res => setTimeout(res, 3000));
                
                // Verificar si se agregaron nuevos productos
                const newProductCount = await page.$$eval('.searchproductcss_card', cards => cards.length);
                if (newProductCount <= previousCount) {
                    scrollAttempts++;
                } else {
                    scrollAttempts = 0; // Resetear intentos si se encontraron nuevos productos
                }
                
                // Salir si alcanzamos el máximo
                if (productCount >= maxProducts) break;
            }
            return productCount;
        };
        
        // Cargar productos mediante scroll
        const productCount = await scrollAndLoad();
        
        // Extraer datos de los productos
        const products = await page.$$eval('.searchproductcss_card', (cards) => 
            cards.map(card => {
                // Intentar extraer el enlace (complicado, puede no estar disponible)
                let link = '';
                const linkEl = card.querySelector('a[href]');
                if (linkEl) {
                    link = linkEl.href;
                }
                
                // Extraer imagen
                const imgEl = card.querySelector('img.searchproductcss_Style');
                const image = imgEl ? imgEl.src : '';
                
                // Extraer fabricante
                let manufacturer = '';
                const mfgEl = card.querySelector('.searchproductcss_typo > div');
                if (mfgEl) {
                    manufacturer = mfgEl.textContent.trim();
                }
                
                // Extraer SKU
                let sku = '';
                const skuEl = card.querySelector('.searchproductcss_typosku');
                if (skuEl) {
                    sku = skuEl.textContent.trim();
                }
                
                // Extraer nombre del producto
                let name = '';
                const nameEl = card.querySelector('.searchproductcss_typo:not(.searchproductcss_typosku)');
                if (nameEl && nameEl.textContent.trim() !== manufacturer) {
                    name = nameEl.textContent.trim();
                }
                
                // Extraer descripción
                let description = '';
                const descEl = card.querySelector('.searchproductcss_typodesc > div');
                if (descEl) {
                    description = descEl.textContent.trim();
                }
                
                // Extraer precio
                let price = '';
                const priceEl = card.querySelector('.searchproductcss_typoList:last-child');
                if (priceEl) {
                    price = priceEl.textContent.trim();
                }
                
                // Extraer disponibilidad
                let availability = '';
                const stockEl = card.querySelector('.searchproductcss_typostock > div');
                if (stockEl) {
                    availability = stockEl.textContent.trim();
                }
                
                return {
                    name: name || description.substring(0, 50) + '...', // Usar descripción si no hay nombre
                    sku,
                    price: price || 'Price not available',
                    image,
                    link: link || '', // Puede estar vacío
                    site: 'Banner Solutions',
                    manufacturer,
                    availability
                };
            })
        );

        return {
            query: searchQuery,
            products: products.map(data => new Product(data)),
            productCount: products.length
        };

    } catch (error) {
        console.error('Error scraping Banner Solutions:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

module.exports = scrapeBannerSolutions;