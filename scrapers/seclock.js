const puppeteer = require('puppeteer');
const Product = require('../models/Product');

async function scrapeSeclock(searchQuery = '') {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        // Navegar a la página principal
        await page.goto('https://www.seclock.com/', { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        // Hacer clic en el botón de búsqueda para activar el campo de entrada
        const searchButtonSelector = 'button.hidden.at1024\\:flex'; // Usamos escape para la clase con :
        await page.waitForSelector(searchButtonSelector, { timeout: 15000 });
        await page.click(searchButtonSelector);

        // Esperar a que aparezca el campo de búsqueda
        await page.waitForSelector('input[data-dialog-focus="true"]', { timeout: 10000 });
        
        // Ingresar la consulta de búsqueda
        await page.type('input[data-dialog-focus="true"]', searchQuery, { delay: 100 });
        
        // Esperar a que aparezcan los resultados
        await page.waitForSelector('ul.mb-16', { timeout: 15000 });
        await new Promise(res => setTimeout(res, 3000));// Espera adicional para que se carguen los resultados

        // Extraer datos de los productos
        const products = await page.$$eval('ul.mb-16 > li', (items) => 
            items.map(item => {
                // Extraer enlace
                const linkEl = item.querySelector('a[href]');
                const link = linkEl ? linkEl.href : '';
                
                // Extraer imagen
                const imgEl = item.querySelector('img[src]');
                const image = imgEl ? imgEl.src : '';
                
                // Extraer detalles
                const detailsEl = item.querySelector('span.block.text-left.ml-6.w-80');
                let manufacturer = '';
                let sku = '';
                let name = '';
                
                if (detailsEl) {
                    // Fabricante (primer span con type-secondary)
                    const manufacturerEl = detailsEl.querySelector('span.type-secondary');
                    manufacturer = manufacturerEl ? manufacturerEl.textContent.trim() : '';
                    
                    // SKU (primer span con type-primary)
                    const skuEl = detailsEl.querySelector('span.type-primary.text-lg');
                    sku = skuEl ? skuEl.textContent.trim() : '';
                    
                    // Nombre del producto (segundo span con type-primary)
                    const nameEls = detailsEl.querySelectorAll('span.type-primary');
                    if (nameEls.length > 1) {
                        name = nameEls[1].textContent.trim();
                    }
                }
                
                return {
                    name,
                    sku,
                    price: 'Log in for pricing', // El sitio requiere login para precios
                    image,
                    link,
                    site: 'Seclock',
                    manufacturer
                };
            })
        );

        return {
            query: searchQuery,
            products: products.map(data => new Product(data)),
            productCount: products.length
        };

    } catch (error) {
        console.error('Error scraping Seclock:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

module.exports = scrapeSeclock;