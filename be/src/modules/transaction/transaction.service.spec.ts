import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Transaction, TransactionStatus, TransactionType } from './transaction.entity';
import { TransactionService } from './transaction.service';

describe('TransactionService (Flows 5-7, AF-1, AF-2, AF-3, EF-2, EF-3)', () => {
  let service: TransactionService;
  let repository: jest.Mocked<Repository<Transaction>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Transaction>>;

  const createMockTransaction = (overrides: Partial<Transaction> = {}): Transaction => {
    const tx = new Transaction();
    tx.transactionId = overrides.transactionId ?? 1;
    tx.accountId = overrides.accountId ?? 10;
    tx.transactionDate = overrides.transactionDate ?? new Date('2026-08-25T00:00:00.000Z');
    tx.type = overrides.type ?? TransactionType.EXPENSE;
    tx.itemDescription = overrides.itemDescription ?? 'Coffee & Snacks';
    tx.shopName = overrides.shopName ?? 'Starbucks';
    tx.amount = overrides.amount ?? 85000;
    tx.paymentMethod = overrides.paymentMethod ?? 'Credit Card';
    tx.status = overrides.status ?? TransactionStatus.COMPLETE;
    tx.categoryId = overrides.categoryId ?? 1;
    return tx;
  };

  beforeEach(() => {
    queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<Transaction>>;

    repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as jest.Mocked<Repository<Transaction>>;

    service = new TransactionService(repository);
  });

  describe('Flow 5, 6, 7 & AF-1: Query construction and owner isolation', () => {
    it('queries transactions scoped to accounts owned by user_id with type=All', async () => {
      const userId = 5;
      const mockTx = createMockTransaction({
        transactionId: 100,
        accountId: 10,
        transactionDate: new Date('2026-08-20T00:00:00.000Z'),
        type: TransactionType.REVENUE,
        itemDescription: 'Monthly Salary',
        shopName: 'Company XYZ',
        amount: 25000000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
      });

      queryBuilder.getCount.mockResolvedValue(1);
      queryBuilder.getMany.mockResolvedValue([mockTx]);

      const result = await service.findAllByUserId(userId, { type: 'All', limit: '10', offset: '0' });

      // Flow 5: innerJoin ensures only accounts owned by userId are queried
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('transaction');
      expect(queryBuilder.innerJoin).toHaveBeenCalledWith(
        'transaction.account',
        'account',
        'account.userId = :userId',
        { userId: 5 },
      );

      // AF-1 2c: If All is selected, no type predicate is applied
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();

      // Flow 6: ordered by transaction_date DESC, transaction_id DESC, with skip and take
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('transaction.transactionDate', 'DESC');
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('transaction.transactionId', 'DESC');
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);

      // Flow 7: Returns data, total, and hasMore
      expect(result).toEqual({
        data: [
          {
            transaction_id: 100,
            account_id: 10,
            transaction_date: '2026-08-20',
            type: TransactionType.REVENUE,
            item_description: 'Monthly Salary',
            shop_name: 'Company XYZ',
            amount: 25000000,
            payment_method: 'Bank Transfer',
            status: TransactionStatus.COMPLETE,
          },
        ],
        total: 1,
        hasMore: false,
      });
    });

    it('AF-1: applies type predicate when type is Revenue', async () => {
      queryBuilder.getCount.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      await service.findAllByUserId(1, { type: TransactionType.REVENUE, limit: '10', offset: '0' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'transaction.type = :type',
        { type: TransactionType.REVENUE },
      );
    });

    it('AF-1: applies type predicate when type is Expense', async () => {
      queryBuilder.getCount.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      await service.findAllByUserId(1, { type: TransactionType.EXPENSE, limit: '10', offset: '0' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'transaction.type = :type',
        { type: TransactionType.EXPENSE },
      );
    });
  });

  describe('AF-2: Pagination & hasMore logic', () => {
    it('sets hasMore to true when offset + returned rows is less than total count', async () => {
      const mockList = Array.from({ length: 10 }, (_, i) =>
        createMockTransaction({ transactionId: i + 1 }),
      );

      queryBuilder.getCount.mockResolvedValue(25);
      queryBuilder.getMany.mockResolvedValue(mockList);

      const result = await service.findAllByUserId(1, { type: 'All', limit: '10', offset: '0' });

      expect(result.data.length).toBe(10);
      expect(result.total).toBe(25);
      expect(result.hasMore).toBe(true); // 0 + 10 < 25
    });

    it('sets hasMore to false when the last page is reached (offset + length == total)', async () => {
      const mockList = Array.from({ length: 5 }, (_, i) =>
        createMockTransaction({ transactionId: i + 21 }),
      );

      queryBuilder.getCount.mockResolvedValue(25);
      queryBuilder.getMany.mockResolvedValue(mockList);

      const result = await service.findAllByUserId(1, { type: 'All', limit: '10', offset: '20' });

      expect(result.data.length).toBe(5);
      expect(result.total).toBe(25);
      expect(result.hasMore).toBe(false); // 20 + 5 === 25
    });
  });

  describe('AF-3: No owned accounts or no matching transactions', () => {
    it('returns empty data array, total = 0, and hasMore = false when no rows match', async () => {
      queryBuilder.getCount.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findAllByUserId(99, { type: 'All', limit: '10', offset: '0' });

      expect(result).toEqual({
        data: [],
        total: 0,
        hasMore: false,
      });
    });
  });

  describe('EF-2: Invalid transaction filter or pagination', () => {
    it('throws BadRequestException when type is invalid or outside All, Revenue, Expense', async () => {
      const invalidTypes = ['InvalidType', 'Transfer', '', null, undefined, 123, true, {}];

      for (const invalidType of invalidTypes) {
        await expect(
          service.findAllByUserId(1, { type: invalidType as any }),
        ).rejects.toThrow(new BadRequestException('Invalid transaction query parameter'));
      }
    });

    it('throws BadRequestException when limit is not a positive integer string', async () => {
      const invalidLimits = ['0', '-1', '-10', 'abc', '1.5', '1e5', '', ' '];

      for (const invalidLimit of invalidLimits) {
        await expect(
          service.findAllByUserId(1, { type: 'All', limit: invalidLimit }),
        ).rejects.toThrow(new BadRequestException('Invalid transaction query parameter'));
      }
    });

    it('throws BadRequestException when offset is not a non-negative integer string', async () => {
      const invalidOffsets = ['-1', '-5', 'xyz', '2.5', '0.1', '', ' '];

      for (const invalidOffset of invalidOffsets) {
        await expect(
          service.findAllByUserId(1, { type: 'All', offset: invalidOffset }),
        ).rejects.toThrow(new BadRequestException('Invalid transaction query parameter'));
      }
    });

    it('uses default values limit=10 and offset=0 when limit and offset are omitted/undefined', async () => {
      queryBuilder.getCount.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      await service.findAllByUserId(1, { type: 'All' });

      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
    });
  });

  describe('EF-3: Retrieval failure', () => {
    it('throws InternalServerErrorException with user-friendly message when database query fails', async () => {
      queryBuilder.getCount.mockRejectedValue(new Error('Database connection lost'));

      await expect(
        service.findAllByUserId(1, { type: 'All', limit: '10', offset: '0' }),
      ).rejects.toThrow(
        new InternalServerErrorException(
          'Đã xảy ra lỗi hệ thống khi lấy danh sách giao dịch. Vui lòng thử lại sau.',
        ),
      );
    });

    it('throws InternalServerErrorException when getMany fails', async () => {
      queryBuilder.getCount.mockResolvedValue(5);
      queryBuilder.getMany.mockRejectedValue(new Error('Query execution timeout'));

      await expect(
        service.findAllByUserId(1, { type: 'All', limit: '10', offset: '0' }),
      ).rejects.toThrow(
        new InternalServerErrorException(
          'Đã xảy ra lỗi hệ thống khi lấy danh sách giao dịch. Vui lòng thử lại sau.',
        ),
      );
    });
  });
});
