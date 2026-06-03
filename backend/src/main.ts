import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'

import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })

  const config = app.get(ConfigService)

  // Security headers (X-Frame-Options, CSP, X-Content-Type-Options, etc.)
  app.use(
    helmet({
      // We need cross-origin requests from the frontend (different port).
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  )
  app.use(cookieParser())
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const allowedOrigins = (config.get<string>('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  })

  app.setGlobalPrefix('api', { exclude: ['/', 'health'] })

  const port = Number(config.get<string>('PORT') ?? 3000)
  await app.listen(port, '0.0.0.0')
}

void bootstrap()
