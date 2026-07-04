import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { WinstonModule } from 'nest-winston';
import { description, name, version } from '../package.json';
import { AppModule } from './app.module';
import { getLogTransport } from './common/logger';
import { ResponseInterceptor } from './middlewares/response.interceptor';
import { GlobalHttpExceptionFilter } from './middlewares/exception.filter';
import { swaggerTitle } from './constants/constants';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import * as bodyParser from 'body-parser';

const logTransport = getLogTransport();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: '*',
    },
    logger: WinstonModule.createLogger({
      transports: logTransport,
    }),
  });
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips unknown properties
      forbidNonWhitelisted: true, // throws if unknown properties are present
      transform: true, // automatically transform payloads
      transformOptions: {
        enableImplicitConversion: true, // allow string→number, etc
      },
      // Enables detailed error messages
      exceptionFactory: (errors) => {
        return new BadRequestException(
          errors.map((e) => ({
            property: e.property,
            constraints: e.constraints,
          })),
        );
      },
    }),
  );
  app.use(cookieParser());
  // Increase JSON and URL-encoded body size limit to 10 MB
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // Ensure upload folder exists
  const iconsPath = join(__dirname, '..', 'uploads', 'icons');
  if (!fs.existsSync(iconsPath)) {
    fs.mkdirSync(iconsPath, { recursive: true });
  }

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle(swaggerTitle)
    .setDescription(description)
    .setVersion(version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT', // Optional, useful for UI
        // name: 'Authorization',
        in: 'header',
      },

      'access-token', // This name is used in @ApiBearerAuth() decorator
    )
    .addSecurityRequirements('access-token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('caa-api-doc', app, document);

  const configService = app.get(ConfigService);
  Logger.log(`Server running on port ${configService.get('PORT')}`);
  await app.listen(configService.get('PORT'));
}
bootstrap();
