import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import dotenv from 'dotenv';

dotenv.config();

// Basic configuration for Swagger
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'The Forge API Documentation',
            version: '1.0.0',
            description: 'Comprehensive API documentation for The Forge API suite',
        },
        servers: [
            {
                url: process.env.HOST_API_URL ?? 'http://localhost:5000', // Change this to your API's base URL
                description: 'Development server',
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Paths to the files containing the API routes and controllers
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

/**
 * Sets up Swagger UI for the API documentation.
 * @param {Express} app The Express.js app to add the Swagger UI to.
 */
export const setupSwagger = (app: Express) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
    console.log('Swagger documentation available at /api-docs');
};
