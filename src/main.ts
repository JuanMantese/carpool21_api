import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  // Inicializar Firebase Admin SDK
  const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'testprojectcar-96e3b.appspot.com'
  });

  // Crear el API Gateway (HTTP server)
  const app = await NestFactory.create(AppModule);

  // Configuración global de pipes (validación)
  app.useGlobalPipes(new ValidationPipe({ forbidUnknownValues: false }));
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  // Iniciar el servidor HTTP para el API Gateway
  await app.listen(3000, process.env.HOST || 'localhost');
}

bootstrap();
