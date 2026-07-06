import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gayrimenkul API',
      version: '1.0.0',
      description: 'Profesyonel Gayrimenkul Yönetim Sistemi REST API Dokümantasyonu',
      contact: {
        name: 'Gayrimenkul Support',
        email: 'destek@gayrimenkul.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api/v1`,
        description: 'Development server',
      },
      {
        url: 'https://api.domain.com/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/modules/**/*.ts', './src/routes/**/*.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
