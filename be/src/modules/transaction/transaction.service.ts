import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus, TransactionType } from './transaction.entity';
import { Account, AccountType } from '../account/account.entity';
import { TransactionListQueryDto } from './dto/transaction-list-query.dto';
import { TransactionDto, TransactionListResponseDto } from './dto/transaction-list-response.dto';

type TransactionFilterType = 'All' | TransactionType.REVENUE | TransactionType.EXPENSE;

interface ValidatedTransactionListQuery {
  type: TransactionFilterType;
  limit: number;
  offset: number;
}

/** Implements read-only, owner-scoped transaction-history retrieval. */
@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  /** Returns a validated page of transactions that belong to the authenticated user. */
  async findAllByUserId(
    userId: number,
    rawQuery: TransactionListQueryDto,
  ): Promise<TransactionListResponseDto> {
    const { type, limit, offset } = this.validateQuery(rawQuery);

    try {
      const queryBuilder = this.transactionRepository
        .createQueryBuilder('transaction')
        .innerJoin('transaction.account', 'account', 'account.userId = :userId', { userId });

      if (type !== 'All') {
        queryBuilder.andWhere('transaction.type = :type', { type });
      }

      const total = await queryBuilder.getCount();
      const transactions = await queryBuilder
        .orderBy('transaction.transactionDate', 'DESC')
        .addOrderBy('transaction.transactionId', 'DESC')
        .skip(offset)
        .take(limit)
        .getMany();
      const data = transactions.map((transaction) => this.toDto(transaction));

      return {
        data,
        total,
        hasMore: offset + data.length < total,
      };
    } catch {
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi hệ thống khi lấy danh sách giao dịch. Vui lòng thử lại sau.',
      );
    }
  }

  /** Normalizes defaults and validates all transaction-list query constraints. */
  private validateQuery(rawQuery: TransactionListQueryDto): ValidatedTransactionListQuery {
    const type = rawQuery.type;

    if (
      typeof type !== 'string'
      || ![TransactionType.REVENUE, TransactionType.EXPENSE, 'All'].includes(type)
    ) {
      throw new BadRequestException('Invalid transaction query parameter');
    }

    return {
      type: type as TransactionFilterType,
      limit: this.parseInteger(rawQuery.limit, 10, (value) => value > 0),
      offset: this.parseInteger(rawQuery.offset, 0, (value) => value >= 0),
    };
  }

  /** Parses a non-scientific integer while preserving omitted-query defaults. */
  private parseInteger(
    value: unknown,
    defaultValue: number,
    predicate: (value: number) => boolean,
  ): number {
    if (value === undefined) {
      return defaultValue;
    }

    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
      throw new BadRequestException('Invalid transaction query parameter');
    }

    const parsedValue = Number(value);

    if (!Number.isSafeInteger(parsedValue) || !predicate(parsedValue)) {
      throw new BadRequestException('Invalid transaction query parameter');
    }

    return parsedValue;
  }

  /** Maps only the contract-approved persisted fields into the response DTO. */
  private toDto(transaction: Transaction): TransactionDto {
    return {
      transaction_id: transaction.transactionId,
      account_id: transaction.accountId,
      transaction_date: this.formatTransactionDate(transaction.transactionDate),
      type: transaction.type,
      item_description: transaction.itemDescription,
      shop_name: transaction.shopName,
      amount: Number(transaction.amount),
      payment_method: transaction.paymentMethod,
      status: transaction.status,
    };
  }

  /** Preserves a database DATE as a timezone-neutral ISO calendar date. */
  private formatTransactionDate(value: Date | string): string {
    if (typeof value === 'string') {
      return value.slice(0, 10);
    }

    return value.toISOString().slice(0, 10);
  }

  /** MỌI THỨ DƯỚI ĐÂY LÀ ĐỂ DỄ DÀNG TEST */
  async seedData(userId: number) {
    const queryRunner = this.transactionRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let account = await queryRunner.manager.findOne(Account, { where: { userId } });
      if (!account) {
        account = queryRunner.manager.create(Account, {
          userId,
          bankName: 'Test Bank',
          accountType: AccountType.CHECKING,
          accountNumberFull: '123456789',
          accountNumberLast4: '6789',
          balance: 50000,
        });
        account = await queryRunner.manager.save(Account, account);
      }

      const transactions: Partial<Transaction>[] = [
        {
          accountId: account.accountId,
          transactionDate: new Date(),
          type: TransactionType.EXPENSE,
          itemDescription: 'Coffee',
          shopName: 'Starbucks',
          amount: 5.50,
          paymentMethod: 'Credit Card',
          status: TransactionStatus.COMPLETE,
        },
        {
          accountId: account.accountId,
          transactionDate: new Date(),
          type: TransactionType.REVENUE,
          itemDescription: 'Salary',
          shopName: 'Company XYZ',
          amount: 3000.00,
          paymentMethod: 'Bank Transfer',
          status: TransactionStatus.COMPLETE,
        },
        {
          accountId: account.accountId,
          transactionDate: new Date(Date.now() - 86400000), // yesterday
          type: TransactionType.EXPENSE,
          itemDescription: 'Groceries',
          shopName: 'Walmart',
          amount: 120.00,
          paymentMethod: 'Credit Card',
          status: TransactionStatus.COMPLETE,
        }
      ];

      for (const t of transactions) {
        await queryRunner.manager.save(Transaction, this.transactionRepository.create(t));
      }

      await queryRunner.commitTransaction();
      return { success: true, message: 'Seeded 3 transactions successfully' };
    } catch (e: any) {
      await queryRunner.rollbackTransaction();
      return { success: false, message: e.message };
    } finally {
      await queryRunner.release();
    }
  }
}
