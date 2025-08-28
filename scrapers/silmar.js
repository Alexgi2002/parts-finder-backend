const puppeteer = require('puppeteer');
const Product = require('../models/Product'); // Asegúrate de tener la ruta correcta

async function scrapeSilmarElectronics(searchQuery = '', pageNumber = 1) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 1000000
    });
    
    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        // Construir URL con parámetros
        const url = `https://www.silmarelectronics.com/advanced_search_result.php?search_in_description=1&q=${encodeURIComponent(searchQuery)}&keywords=${encodeURIComponent(searchQuery)}&&page=${pageNumber}`;
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // Esperar a que los productos carguen
        await page.waitForSelector('table[width="100%"] .item_td', { timeout: 0 });
        
        // Extraer datos de los productos usando el modelo
        const products = await page.evaluate(() => {
            const productCards = Array.from(document.querySelectorAll('table[width="100%"] .item_td'));
            
            return productCards.map(card => {
                const titleElement = card.querySelector('.pr_name');
                const skuElement = titleElement ? titleElement.querySelector('b') : null;
                const brandElement = card.querySelector('tr:nth-child(3) a');
                const imageElement = card.querySelector('img[loading="lazy"]');
                const linkElement = card.querySelector('.pr_name');
                const priceElement = card.querySelector('.pr_price');
                
                // Extraer nombre y SKU del mismo elemento
                let name = '';
                let sku = '';
                
                if (titleElement) {
                    const textContent = titleElement.textContent || '';
                    const parts = textContent.split(/\s*#\s*/);
                    name = parts[0]?.trim() || '';
                    sku = parts[1]?.trim() || '';
                }
                
                // Mapeamos los datos al modelo Product
                return {
                    name: name,
                    sku: sku,
                    price: priceElement ? priceElement.textContent.replace(/\n/g, ' ').trim() : 'Log In To View Prices',
                    image: imageElement ? new URL(imageElement.src, window.location.href).href : '',
                    link: linkElement ? linkElement.href : '',
                    site: 'Silmar Electronics',
                    manufacturer: brandElement ? brandElement.textContent.trim() : ''
                };
            });
        });

        // Crear instancias del modelo Product
        const productInstances = products.map(data => new Product(data));

        console.log('Terminado de extraer productos de Silmar Electronics');

        return {
            page: pageNumber,
            query: searchQuery,
            products: productInstances,
            url
        };

    } catch (error) {
        console.error('Error during scraping Silmar Electronics:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

// Ejemplo de uso
// scrapeSilmarElectronics('door', 3).then(console.log).catch(console.error);

module.exports = scrapeSilmarElectronics;