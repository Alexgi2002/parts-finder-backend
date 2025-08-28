const puppeteer = require('puppeteer');
const Product = require('../models/Product');

async function scrapeWesco(searchQuery = '', maxPages = 5) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        let allProducts = [];
        
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            const url = `https://connect.wesco.com/en/us/search?q=${encodeURIComponent(searchQuery)}&page=${pageNum}`;
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });

            // Esperar a que los productos estén visibles
            await page.waitForSelector('.products-card', { timeout: 30000, visible: true });
            
            // Extraer datos de los productos en la página actual
            const pageProducts = await page.$$eval('.products-card', (cards) => 
                cards.map(card => {
                    // Extraer fabricante
                    const manufacturerEl = card.querySelector('[data-testid^="product-manufacturer-"]');
                    const manufacturer = manufacturerEl ? manufacturerEl.textContent.trim() : '';
                    
                    // Extraer nombre del producto
                    const nameEl = card.querySelector('[data-testid^="product-name-"]');
                    const name = nameEl ? nameEl.textContent.trim() : '';
                    
                    // Extraer número de parte (SKU)
                    const partEl = card.querySelector('[data-testid^="Part#-"]');
                    let sku = '';
                    if (partEl) {
                        const text = partEl.textContent.trim();
                        sku = text.replace('Part #:', '').trim();
                    }
                    
                    // Extraer número de fabricante (MFR)
                    const mfrEl = card.querySelector('[data-testid^="MFR#-"]');
                    let mfrNumber = '';
                    if (mfrEl) {
                        const text = mfrEl.textContent.trim();
                        mfrNumber = text.replace('MFR #:', '').trim();
                    }
                    
                    // Extraer imagen
                    const imgEl = card.querySelector('img[src]');
                    let image = imgEl ? imgEl.src : '';
                    // Manejar imágenes predeterminadas
                    if (image.includes('noproductimage.png')) {
                        image = '';
                    }
                    
                    // Extraer enlace
                    const linkEl = card.querySelector('.details-link[href]');
                    const link = linkEl ? `https://connect.wesco.com${linkEl.getAttribute('href')}` : '';
                    
                    return {
                        name,
                        sku,
                        mfrNumber,
                        price: 'Sign In For Price', // Siempre requiere login
                        image,
                        link,
                        site: 'WESCO',
                        manufacturer
                    };
                })
            );
            
            allProducts = [...allProducts, ...pageProducts];
            
            // Verificar si hay más páginas
            const nextButton = await page.$('button[aria-label="Next page"]:not([disabled])');
            if (!nextButton) break;
        }

        // Mapear al modelo Product
        const products = allProducts.map(item => new Product({
            name: item.name,
            sku: item.sku,
            price: item.price,
            image: item.image,
            link: item.link,
            site: item.site,
            manufacturer: item.manufacturer,
            description: `MFR #: ${item.mfrNumber}` // Usamos el campo description para el número de fabricante
        }));

        console.log('Terminado de extraer productos de Wesco');

        return {
            query: searchQuery,
            products,
            productCount: products.length
        };

    } catch (error) {
        console.error('Error scraping WESCO:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

module.exports = scrapeWesco;