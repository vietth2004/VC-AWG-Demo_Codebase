import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TransactionController } from '../src/modules/transaction/transaction.controller';
import { TransactionService } from '../src/modules/transaction/transaction.service';
import { JwtAuthGuard } from '../src/modules/auth/jwt-auth.guard';
import { TransactionStatus, TransactionType } from '../src/modules/transaction/transaction.entity';
import { GlobalExceptionFilter } from '../src/filters/http-exception.filter';

describe('Transactions API E2E (GET /api/v1/transactions)', () => {
  let app: INestApplication;
  let transactionService: jest.Mocked<TransactionService>;

  const mockJwtGuard = {
    canActivate: jest.fn((context) => {
      const req = context.switchToHttp().getRequest();
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer valid-jwt-token')) {
        return false;
      }
      req.user = { userId: 1 };
      return true;
    }),
  };

  beforeAll(async () => {
    transactionService = {
      findAllByUserId: jest.fn(),
    } as unknown as jest.Mocked<TransactionService>;

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [TransactionController],
      providers: [
        {
          provide: TransactionService,
          useValue: transactionService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Flow 1-4 & 7: Happy path transaction retrieval', () => {
    it('GET /api/v1/transactions with valid JWT and default query returns 200 and paginated transactions', async () => {
      const mockResult = {
        data: [
          {
            transaction_id: 1,
            account_id: 10,
            transaction_date: '2026-08-25',
            type: TransactionType.EXPENSE,
            item_description: 'Lunch at Cafe',
            shop_name: 'The Daily Cafe',
            amount: 75000,
            payment_method: 'Credit Card',
            status: TransactionStatus.COMPLETE,
          },
        ],
        total: 1,
        hasMore: false,
      };

      transactionService.findAllByUserId.mockResolvedValue(mockResult);

      const res = await request(app.getHttpServer())
        .get('/api/v1/transactions?type=All&limit=10&offset=0')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(res.body).toEqual(mockResult);
      expect(transactionService.findAllByUserId).toHaveBeenCalledWith(1, {
        type: 'All',
        limit: '10',
        offset: '0',
      });
    });
  });

  describe('EF-1: Unauthorized Request', () => {
    it('returns 403 or 401 when Authorization header is missing or invalid', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/transactions?type=All&limit=10&offset=0')
        .expect(403);
    });
  });

  describe('AF-1: Filter by transaction type', () => {
    it('filters by Revenue', async () => {
      transactionService.findAllByUserId.mockResolvedValue({
        data: [],
        total: 0,
        hasMore: false,
      });

      await request(app.getHttpServer())
        .get('/api/v1/transactions?type=Revenue&limit=10&offset=0')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(transactionService.findAllByUserId).toHaveBeenCalledWith(1, {
        type: 'Revenue',
        limit: '10',
        offset: '0',
      });
    });

    it('filters by Expense', async () => {
      transactionService.findAllByUserId.mockResolvedValue({
        data: [],
        total: 0,
        hasMore: false,
      });

      await request(app.getHttpServer())
        .get('/api/v1/transactions?type=Expense&limit=10&offset=0')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(transactionService.findAllByUserId).toHaveBeenCalledWith(1, {
        type: 'Expense',
        limit: '10',
        offset: '0',
      });
    });
  });

  describe('AF-3: Empty list when no matching transactions exist', () => {
    it('returns data: [], total: 0, hasMore: false', async () => {
      transactionService.findAllByUserId.mockResolvedValue({
        data: [],
        total: 0,
        hasMore: false,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/transactions?type=All&limit=10&offset=0')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(res.body).toEqual({
        data: [],
        total: 0,
        hasMore: false,
      });
    });
  });
});
