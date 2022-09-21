import express from 'express';
import JobRouter from './jobRouter';
import compression from 'compression';
import helmet from 'helmet';

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 3001;

express()
    .use(compression())
    .use('/job', new JobRouter())
    
    .get('/', helmet.contentSecurityPolicy({
        directives: {
            imgSrc: ["'self'"],
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
        }
    }))
    .get('*', express.static('dist'))
    
    .listen(PORT, () => console.log(`✅  Server started: http://${HOST}:${PORT}`));
