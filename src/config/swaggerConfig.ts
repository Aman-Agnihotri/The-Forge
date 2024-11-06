import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes';
import { Express } from 'express';
import logger from '../services/logger';
import { HOST_API_URL, NODE_ENV } from '../utils/constants';

const swaggerTheme = new SwaggerTheme();

// Basic configuration for Swagger
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'The Forge API Documentation',
            version: '1.0.0',
            description: 'API documentation for The Forge API suite',
        },
        servers: [
            {
                url: HOST_API_URL,
                description: NODE_ENV + ' server',
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: ['./src/routes/*.ts'], // Paths to the files containing the API routes
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

/**
 * Sets up Swagger UI for the API documentation.
 * @param {Express} app The Express.js app to add the Swagger UI to.
 */
export const setupSwagger = (app: Express) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
        customCss: swaggerTheme.getBuffer(SwaggerThemeNameEnum.ONE_DARK),
        swaggerOptions: { persistAuthorization: true } 
    }));
    logger.debug('Swagger documentation available at /api-docs');
};
