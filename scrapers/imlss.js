const puppeteer = require('puppeteer');
const Product = require('../models/Product');

async function scrapeIMLSS(searchQuery = '', maxPages = 5) {
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
            const url = `https://shop.imlss.com/item_view/shop/?_s=${encodeURIComponent(searchQuery)}&_ipp=20&item_page=${pageNum}`;
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Esperar a que los productos estén visibles
            await page.waitForSelector('.item-list', { timeout: 0 });
            
            // Extraer datos de los productos en la página actual
            const pageProducts = await page.$$eval('.item-list', (items) => 
                items.map(item => {
                    // Extraer nombre y SKU
                    const descLink = item.querySelector('.item-desc-link');
                    let name = '';
                    let sku = '';
                    
                    if (descLink) {
                        // El nombre está en el primer nodo de texto
                        const textNodes = Array.from(descLink.childNodes).filter(node => node.nodeType === 3);
                        name = textNodes[0] ? textNodes[0].textContent.trim() : '';
                        
                        // El SKU está en la etiqueta <b> dentro del enlace
                        const skuEl = descLink.querySelector('b');
                        sku = skuEl ? skuEl.textContent.trim() : '';
                    }
                    
                    // Extraer fabricante
                    let manufacturer = '';
                    const mfgText = item.textContent.match(/Mfg:&nbsp;(.+)/);
                    if (mfgText && mfgText[1]) {
                        manufacturer = mfgText[1].trim();
                    }
                    
                    // Extraer imagen
                    const imgEl = item.querySelector('img[src]');
                    let image = imgEl ? imgEl.src : '';
                    
                    // Extraer enlace
                    const linkEl = item.querySelector('search_img_link[href]');
                    const link = linkEl ? `https://shop.imlss.com${linkEl.getAttribute('href')}` : '';
                    
                    // Extraer disponibilidad
                    let availability = '';
                    const availEl = item.querySelector('.cv_item-available b');
                    if (availEl) {
                        availability = `Available: ${availEl.textContent.trim()}`;
                    }
                    
                    return {
                        name,
                        sku,
                        price: 'Log in for pricing', // Requiere login
                        image,
                        link,
                        site: 'IMLSS',
                        manufacturer,
                        availability
                    };
                })
            );
            
            allProducts = [...allProducts, ...pageProducts];
            
            // Verificar si hay más páginas
            const nextPageLink = await page.$('a[href*="item_page="]');
            if (!nextPageLink) break;
        }

        return {
            query: searchQuery,
            products: allProducts.map(data => new Product(data)),
            productCount: allProducts.length
        };

    } catch (error) {
        console.error('Error scraping IMLSS:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

module.exports = scrapeIMLSS;