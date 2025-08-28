const puppeteer = require('puppeteer');
const Product = require('../models/Product');

async function scrapeDoorControls(searchQuery = '') {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        let allProducts = [];
        const maxPages = 3;
        
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            const url = `https://www.doorcontrolsusa.com/products?page=${pageNum}&query=${encodeURIComponent(searchQuery)}`;
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 100000 });

            try {
                // Esperar a que los productos estén visibles
                await page.waitForSelector('.search-hit-item', { timeout: 0, visible: true });
                
                // Extraer datos de los productos en la página actual
                const pageProducts = await page.$$eval('.search-hit-item', (cards) => 
                    cards.map(card => {
                        // Extraer marca
                        const brandEl = card.querySelector('.search-hit-item__brand');
                        const brand = brandEl ? brandEl.textContent.trim() : 'Marca no disponible';
                        
                        // Extraer SKU
                        const skuEl = card.querySelector('.search-hit-item__sku');
                        const sku = skuEl ? skuEl.textContent.trim() : 'SKU no disponible';
                        
                        // Extraer título
                        const titleEl = card.querySelector('.search-hit-item__title');
                        const title = titleEl ? titleEl.textContent.trim() : 'Título no disponible';
                        
                        // Extraer imagen
                        const imgEl = card.querySelector('.search-hit-item__image');
                        const image = imgEl ? imgEl.src : '';
                        
                        // Extraer enlace
                        const linkEl = card.querySelector('.search-hit-item__link');
                        const link = linkEl ? `https://www.doorcontrolsusa.com${linkEl.getAttribute('href')}` : '';
                        
                        return {
                            brand,
                            sku,
                            title,
                            image,
                            link
                        };
                    })
                );
                
                allProducts = [...allProducts, ...pageProducts];
                
                // Verificar si hay más páginas
                const nextPageDisabled = await page.$('a[rel="next"][aria-disabled="true"]');
                if (nextPageDisabled) break;
                
            } catch (error) {
                console.error(`Error en página ${pageNum}:`, error);
                if (pageNum === 1) throw error;
                break;
            }
        }

        // Mapear al modelo Product
        const products = allProducts.map(item => new Product({
            name: item.title,
            sku: item.sku,
            price: 'Log in to view pricing',
            image: item.image,
            link: item.link,
            site: 'Door Controls USA',
            manufacturer: item.brand
        }));

        return {
            query: searchQuery,
            products,
            productCount: products.length
        };

    } catch (error) {
        console.error('Error scraping Door Controls USA:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

module.exports = scrapeDoorControls;