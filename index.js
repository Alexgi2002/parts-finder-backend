const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
const scrapeDoorControls = require('./scrapers/doorcontrolsusa');
const scrapeSdepot = require('./scrapers/sdepot');
const scrapeSilmarElectronics = require('./scrapers/silmar');
const scrapeAdiGlobal = require('./scrapers/adiglobal');
const scrapeWesco = require('./scrapers/wesco');
const scrapeIMLSS = require('./scrapers/imlss');
const scraperSecLock = require('./scrapers/seclock');
const scraperBannerSolutions = require('./scrapers/banner');
const e = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de caché (2 horas de duración)
const cache = new NodeCache({ stdTTL: 7200, checkperiod: 3600 });

// Middleware
app.use(cors());
app.use(express.json());

// Timeout global para todas las solicitudes (40 segundos)
app.use((req, res, next) => {
    res.setTimeout(1200000, () => {
        res.status(504).json({ error: 'Tiempo de espera excedido' });
    });
    next();
});

// Función principal para obtener resultados
async function fetchResults(query) {
    const withTimeout = (promise, timeout) => 
        Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), timeout)
            )
        ]);
    
    const results = await Promise.allSettled([
        withTimeout(scrapeDoorControls(query), 600000),
        withTimeout(scrapeSdepot(query), 600000),
        withTimeout(scrapeSilmarElectronics(query), 600000),
        withTimeout(scrapeAdiGlobal(query), 600000),
        withTimeout(scrapeIMLSS(query), 600000),
        withTimeout(scrapeWesco(query), 600000),
        withTimeout(scraperBannerSolutions(query), 600000),
        withTimeout(scraperSecLock(query), 600000)
    ]);

    return {
        query,
        results: [
            formatResult(results[0], 'Door Controls USA'),
            formatResult(results[1], 'SDEPOT'),
            formatResult(results[2], 'Silmar Electronics'),
            formatResult(results[3], 'ADI Global'),
            formatResult(results[4], 'IMLSS'),
            formatResult(results[5], 'Wesco'),
            formatResult(results[6], 'Banner Solutions'),
            formatResult(results[7], 'Seclock'),
        ],
        timestamp: new Date().toISOString(),
        totalProducts: Object.values(results).reduce(
            (sum, site) => sum + (site.success ? site.productCount : 0), 0
        )
    };
}

// Función para formatear resultados
function formatResult(result, siteName) {
    console.log("Resultado de " + siteName, result.status);
    if (result.status === 'fulfilled') {
        return {
            success: true,
            site: siteName,
            productCount: result.value.productCount,
            data: {
                url: result.value.url,
                products: result.value.products
            }
        };
    } else {
        return {
            success: false,
            site: siteName,
            error: result.reason.message || 'Error desconocido'
        };
    }
}

// Endpoint regular con caché
app.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'Parámetro de búsqueda "q" requerido' });
    }

    try {
        // Verificar caché
        const cached = cache.get(query);
        const now = Date.now();
        
        // Si hay datos en caché
        if (cached) {
            // Enviar respuesta inmediata
            res.json(cached);
            
            // Si los datos tienen más de 1 hora, actualizar en segundo plano
            if (now - cached.cacheTimestamp > 3600000) {
                fetchResults(query)
                    .then(freshData => {
                        freshData.cacheTimestamp = now;
                        freshData.cached = true;
                        cache.set(query, freshData);
                    })
                    .catch(error => {
                        console.error('Error al actualizar caché:', error);
                    });
            }
            return;
        }

        // Si no hay caché, obtener resultados
        const results = await fetchResults(query);
        results.cacheTimestamp = now;
        results.cached = false;
        cache.set(query, results);
        res.json(results);
        
    } catch (error) {
      console.error('Error en el servidor:', error);
        res.status(500).json({ 
            error: 'Error en el servidor', 
            details: error.message
        });
    }
});

// Endpoint de streaming (Server-Sent Events)
app.get('/search-stream', (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'Parámetro de búsqueda "q" requerido' });
    }

    // Configurar SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Función para enviar eventos
    const sendEvent = (event, data) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Enviar evento de inicio
    sendEvent('start', { 
        query, 
        timestamp: new Date().toISOString() 
    });

    // Función para ejecutar y enviar resultados de un scraper
    const runScraper = (scraper, siteName, siteKey) => {
        scraper(query)
            .then(data => {
                sendEvent(siteKey, {
                    success: true,
                    site: siteName,
                    productCount: data.productCount,
                    data: {
                        url: data.url,
                        products: data.products
                    }
                });
            })
            .catch(error => {
                sendEvent(siteKey, {
                    success: false,
                    site: siteName,
                    error: error.message || 'Error en el scraper'
                });
            });
    };

    // Ejecutar todos los scrapers en paralelo
    runScraper(scrapeDoorControls, 'Door Controls USA', 'doorControls');
    runScraper(scrapeSdepot, 'SDEPOT', 'sdepot');
    runScraper(scrapeSilmarElectronics, 'Silmar Electronics', 'silmar');
    runScraper(scrapeAdiGlobal, 'ADI Global', 'adiGlobal');

    // Manejar cierre de conexión
    req.on('close', () => {
        console.log(`Cliente desconectado de SSE para búsqueda: ${query}`);
        // No necesitamos hacer nada más, las operaciones continuarán en segundo plano
    });
});

// Endpoint para ver estadísticas de caché
app.get('/cache-info', (req, res) => {
    const stats = cache.getStats();
    const keys = cache.keys();
    
    res.json({
        keys: keys.length,
        hits: stats.hits,
        misses: stats.misses,
        ksize: stats.ksize,
        vsize: stats.vsize
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
    console.log(`🔍 Endpoint regular: GET /search?q=puerta`);
    console.log(`📡 Endpoint streaming: GET /search-stream?q=puerta`);
    console.log(`📊 Estadísticas de caché: GET /cache-info`);
});