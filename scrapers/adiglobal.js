const puppeteer = require('puppeteer');
const Product = require('../models/Product');

async function scrapeAdiGlobal(searchQuery = '') {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        const url = `https://www.adiglobaldistribution.us/search?q=${encodeURIComponent(searchQuery)}`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Esperar a que los productos iniciales carguen
        await page.waitForSelector('.GridItemStyle-sc-1uambol', { timeout: 0 });
        
        // Función para cargar más productos
        const loadMoreProducts = async () => {
            let hasMore = true;
            let loadCount = 0;
            const maxLoads = 10;
            
            while (hasMore && loadCount < maxLoads) {
                try {
                    // Esperar a que el botón esté disponible
                    await page.waitForSelector('button:has-text("Show More Products")', { timeout: 5000 });
                    const button = await page.$('button:has-text("Show More Products")');
                    
                    if (button) {
                        await button.click();
                        // Esperar a que nuevos productos se carguen
                        await page.waitForResponse(response => 
                            response.url().includes('search') && response.status() === 200,
                            { timeout: 10000 }
                        );
                        loadCount++;
                    } else {
                        hasMore = false;
                    }
                } catch (error) {
                    hasMore = false;
                }
            }
        };
        
        await loadMoreProducts();

        // Obtener todos los productos
        const productHandles = await page.$$('.GridItemStyle-sc-1uambol');
        const products = [];

        for (const productHandle of productHandles) {
            try {
                // Extraer datos usando una combinación de métodos
                const name = await productHandle.$eval(
                    '[data-test-selector="productDescriptionLink"] span', 
                    el => el.textContent.trim()
                ).catch(() => '');
                
                const brand = await productHandle.$eval(
                    '[data-test-selector="brandLink"] span', 
                    el => el.textContent.trim()
                ).catch(() => 'Marca no disponible');
                
                const sku = await productHandle.$eval(
                    '[data-test-selector="plpPartNumberGrid"] span:first-child', 
                    el => el.textContent.trim()
                ).catch(() => 'SKU no disponible');
                
                const image = await productHandle.$eval(
                    'img[src]', 
                    el => el.src
                ).catch(() => '');
                
                const link = await productHandle.$eval(
                    '[data-test-selector="productImage"]', 
                    el => `https://www.adiglobaldistribution.us${el.getAttribute('href')}`
                ).catch(() => '');

                if(name === '') {
                    console.warn('Producto incompleto encontrado y se omitirá:', { name, link });
                    // console.log(productHandle);
                    continue;
                }

                products.push({
                    name,
                    sku,
                    price: 'Sign In for Dealer Pricing',
                    image,
                    link,
                    site: 'ADI Global Distribution',
                    manufacturer: brand
                });
            } catch (error) {
                console.error('Error extrayendo un producto:', error);
            }
        }

        return {
            query: searchQuery,
            products: products.map(data => new Product(data)),
            productCount: products.length
        };

    } catch (error) {
        console.error('Error scraping ADI Global:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

module.exports = scrapeAdiGlobal;