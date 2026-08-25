import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const message = errors
          .flatMap((error) => Object.values(error.constraints ?? {}))[0];

        return new BadRequestException(`Bad Request / ${message ?? 'Invalid request body'}`);
      },
    }),
  );

  // Cấu hình CORS
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3001', 'http://localhost:5173'];

  app.enableCors({
    origin: (origin, callback) => {
      // Cho phép requests không có origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      // Kiểm tra origin có trong danh sách allowed
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Cho phép gửi cookies và authorization headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Authorization'],
  });

  // Cấu hình Swagger
  const config = new DocumentBuilder()
    .setTitle('Financial Management API')
    .setDescription('API documentation cho ứng dụng quản lý tài chính')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .addTag('auth', 'Xác thực người dùng')
    .addTag('users', 'Quản lý người dùng')
    .addTag('accounts', 'Quản lý tài khoản')
    .addTag('transactions', 'Quản lý giao dịch')
    .addTag('bills', 'Quản lý hóa đơn')
    .addTag('goals', 'Quản lý mục tiêu')
    .addTag('expenses', 'Quản lý chi tiêu')
    .addTag('categories', 'Quản lý danh mục')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Tự động tạo tài khoản test khi khởi động server
  try {
    const { AuthService } = require('./modules/auth/auth.service');
    const authService = app.get(AuthService);
    await authService.register({
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    console.log('✅ Đã tạo tài khoản test thành công: test@example.com / Password123!');
  } catch (error) {
    if (error.message.includes('Conflict')) {
      console.log('ℹ️ Tài khoản test đã tồn tại: test@example.com / Password123!');
    } else {
      console.error('⚠️ Không thể tạo tài khoản test:', error.message);
      require('fs').appendFileSync('error.log', new Date().toISOString() + ' Main Error: ' + (error.stack || error.message || error) + '\n');
    }
  }

  await app.listen(process.env.PORT ?? 8001);
  console.log(`🚀 Application is running on: http://localhost:${process.env.PORT ?? 8001}`);
  console.log(`📚 Swagger documentation: http://localhost:${process.env.PORT ?? 8001}/api/docs`);
}
bootstrap();
