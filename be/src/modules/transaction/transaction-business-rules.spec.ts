import { TransactionStatus, TransactionType } from './transaction.entity';

/**
 * Interface definitions matching the OCL Business Rules specification:
 * context TransactionService::create(user_id : Integer, dto : CreateTransactionDto) : CreateTransactionResponseDto
 */
export interface CreateTransactionDto {
  accountId?: number;
  transactionDate?: string | Date;
  type?: TransactionType;
  itemDescription?: string;
  shopName?: string;
  paymentMethod?: string;
  amount?: number;
  status?: TransactionStatus;
  category_id?: number;
}

export interface CreatedTransactionData {
  transactionId: number;
  accountId: number;
  transactionDate: string | Date;
  type: TransactionType;
  itemDescription: string;
  shopName: string;
  paymentMethod: string;
  amount: number;
  status: TransactionStatus;
  category_id?: number;
}

export interface CreateTransactionResponseDto {
  success: boolean;
  message: string;
  data: CreatedTransactionData;
}

export interface MockAccount {
  account_id: number;
  user_id: number;
  balance: number;
}

export interface MockCategory {
  category_id: number;
  category_name: string;
}

export interface MockTransactionEntity {
  transaction_id: number;
  account_id: number;
  transaction_date: string | Date;
  type: TransactionType;
  item_description: string;
  shop_name: string;
  amount: number;
  payment_method: string;
  status: TransactionStatus;
  category_id?: number;
}

/**
 * Reference implementation / validation function encapsulating the OCL pre/post rules and invariants
 * for BR-TXN-08 through BR-TXN-15.
 */
export class TransactionBusinessRulesEngine {
  constructor(
    private accounts: MockAccount[],
    private categories: MockCategory[],
    private transactions: MockTransactionEntity[],
  ) {}

  async create(userId: number, dto: CreateTransactionDto, shouldSimulateDbError: boolean = false): Promise<CreateTransactionResponseDto> {
    // BR-TXN-08: Required transaction data
    if (dto.accountId === undefined || dto.accountId === null) {
      throw new Error('BR_TXN_08: accountId is required');
    }
    if (dto.transactionDate === undefined || dto.transactionDate === null) {
      throw new Error('BR_TXN_08: transactionDate is required');
    }
    if (dto.type === undefined || dto.type === null) {
      throw new Error('BR_TXN_08: type is required');
    }
    if (dto.itemDescription === undefined || dto.itemDescription === null || dto.itemDescription.trim().length === 0) {
      throw new Error('BR_TXN_08: itemDescription is required and cannot be blank');
    }
    if (dto.shopName === undefined || dto.shopName === null || dto.shopName.trim().length === 0) {
      throw new Error('BR_TXN_08: shopName is required and cannot be blank');
    }
    if (dto.paymentMethod === undefined || dto.paymentMethod === null || dto.paymentMethod.trim().length === 0) {
      throw new Error('BR_TXN_08: paymentMethod is required and cannot be blank');
    }
    if (dto.amount === undefined || dto.amount === null || typeof dto.amount !== 'number' || dto.amount < 0.01) {
      throw new Error('BR_TXN_08: amount is required and must be >= 0.01');
    }

    // BR-TXN-09: Allowed transaction type and status
    if (dto.type !== TransactionType.REVENUE && dto.type !== TransactionType.EXPENSE) {
      throw new Error('BR_TXN_09: type must be Revenue or Expense');
    }
    const allowedStatuses = [TransactionStatus.COMPLETE, TransactionStatus.PENDING, TransactionStatus.FAILED];
    if (dto.status !== undefined && !allowedStatuses.includes(dto.status)) {
      throw new Error('BR_TXN_09: status must be Complete, Pending, or Failed');
    }
    const resolvedStatus = dto.status !== undefined ? dto.status : TransactionStatus.COMPLETE;

    // BR-TXN-10: Optional category must be valid when supplied
    if (dto.category_id !== undefined && dto.category_id !== null) {
      const categoryExists = this.categories.some((c) => c.category_id === dto.category_id);
      if (!categoryExists) {
        throw new Error('BR_TXN_10: Supplied category_id does not exist');
      }
    }

    // BR-TXN-11: Account ownership
    const account = this.accounts.find((a) => a.account_id === dto.accountId && a.user_id === userId);
    if (!account) {
      throw new Error('BR_TXN_11: Account not found or not owned by the authenticated user');
    }

    // BR-TXN-12: Sufficient balance for Expense
    if (dto.type === TransactionType.EXPENSE) {
      if (account.balance < dto.amount) {
        throw new Error('BR_TXN_12: Insufficient balance for Expense transaction');
      }
    }

    // BR-TXN-15: Atomic transaction creation (Transaction simulation with rollback support)
    const initialAccountBalance = account.balance;
    const initialTransactionsCount = this.transactions.length;

    try {
      if (shouldSimulateDbError) {
        throw new Error('Database write failure');
      }

      // BR-TXN-13: Account balance adjustment
      if (dto.type === TransactionType.REVENUE) {
        account.balance = initialAccountBalance + dto.amount;
      } else if (dto.type === TransactionType.EXPENSE) {
        account.balance = initialAccountBalance - dto.amount;
      }

      // BR-TXN-14: Created transaction maps to request and database
      const newTransactionId = initialTransactionsCount + 1;
      const persistedTransaction: MockTransactionEntity = {
        transaction_id: newTransactionId,
        account_id: dto.accountId,
        transaction_date: dto.transactionDate,
        type: dto.type,
        item_description: dto.itemDescription.trim(),
        shop_name: dto.shopName.trim(),
        amount: dto.amount,
        payment_method: dto.paymentMethod.trim(),
        status: resolvedStatus,
        category_id: dto.category_id ?? undefined,
      };

      this.transactions.push(persistedTransaction);

      return {
        success: true,
        message: 'Transaction created successfully',
        data: {
          transactionId: newTransactionId,
          accountId: persistedTransaction.account_id,
          transactionDate: persistedTransaction.transaction_date,
          type: persistedTransaction.type,
          itemDescription: persistedTransaction.item_description,
          shopName: persistedTransaction.shop_name,
          amount: persistedTransaction.amount,
          paymentMethod: persistedTransaction.payment_method,
          status: persistedTransaction.status,
          category_id: persistedTransaction.category_id,
        },
      };
    } catch (error) {
      // BR-TXN-15: Rollback upon failure
      account.balance = initialAccountBalance;
      this.transactions.length = initialTransactionsCount;
      throw error;
    }
  }
}

describe('Business Rules Specification (BR-TXN-08 to BR-TXN-15)', () => {
  const userId = 10;
  let accounts: MockAccount[];
  let categories: MockCategory[];
  let transactions: MockTransactionEntity[];
  let engine: TransactionBusinessRulesEngine;

  beforeEach(() => {
    accounts = [
      { account_id: 1, user_id: 10, balance: 1000000 },
      { account_id: 2, user_id: 99, balance: 5000000 }, // Owned by another user
    ];

    categories = [
      { category_id: 1, category_name: 'Food & Dining' },
      { category_id: 2, category_name: 'Salary' },
    ];

    transactions = [];

    engine = new TransactionBusinessRulesEngine(accounts, categories, transactions);
  });

  describe('BR-TXN-08: Required transaction data', () => {
    const validDto: CreateTransactionDto = {
      accountId: 1,
      transactionDate: '2026-08-25',
      type: TransactionType.EXPENSE,
      itemDescription: 'Lunch',
      shopName: 'Bistro',
      paymentMethod: 'Credit Card',
      amount: 150000,
    };

    it('rejects when accountId is missing/undefined', async () => {
      const dto = { ...validDto, accountId: undefined };
      await expect(engine.create(userId, dto)).rejects.toThrow('BR_TXN_08: accountId is required');
    });

    it('rejects when transactionDate is missing/undefined', async () => {
      const dto = { ...validDto, transactionDate: undefined };
      await expect(engine.create(userId, dto)).rejects.toThrow('BR_TXN_08: transactionDate is required');
    });

    it('rejects when type is missing/undefined', async () => {
      const dto = { ...validDto, type: undefined };
      await expect(engine.create(userId, dto)).rejects.toThrow('BR_TXN_08: type is required');
    });

    it('rejects when itemDescription is undefined, empty, or whitespace-only', async () => {
      await expect(engine.create(userId, { ...validDto, itemDescription: undefined })).rejects.toThrow('BR_TXN_08: itemDescription is required');
      await expect(engine.create(userId, { ...validDto, itemDescription: '' })).rejects.toThrow('BR_TXN_08: itemDescription is required');
      await expect(engine.create(userId, { ...validDto, itemDescription: '   ' })).rejects.toThrow('BR_TXN_08: itemDescription is required');
    });

    it('rejects when shopName is undefined, empty, or whitespace-only', async () => {
      await expect(engine.create(userId, { ...validDto, shopName: undefined })).rejects.toThrow('BR_TXN_08: shopName is required');
      await expect(engine.create(userId, { ...validDto, shopName: '' })).rejects.toThrow('BR_TXN_08: shopName is required');
      await expect(engine.create(userId, { ...validDto, shopName: '   ' })).rejects.toThrow('BR_TXN_08: shopName is required');
    });

    it('rejects when paymentMethod is undefined, empty, or whitespace-only', async () => {
      await expect(engine.create(userId, { ...validDto, paymentMethod: undefined })).rejects.toThrow('BR_TXN_08: paymentMethod is required');
      await expect(engine.create(userId, { ...validDto, paymentMethod: '' })).rejects.toThrow('BR_TXN_08: paymentMethod is required');
      await expect(engine.create(userId, { ...validDto, paymentMethod: '   ' })).rejects.toThrow('BR_TXN_08: paymentMethod is required');
    });

    it('rejects when amount is missing or less than 0.01', async () => {
      await expect(engine.create(userId, { ...validDto, amount: undefined })).rejects.toThrow('BR_TXN_08: amount is required');
      await expect(engine.create(userId, { ...validDto, amount: 0 })).rejects.toThrow('BR_TXN_08: amount is required and must be >= 0.01');
      await expect(engine.create(userId, { ...validDto, amount: -10 })).rejects.toThrow('BR_TXN_08: amount is required and must be >= 0.01');
      await expect(engine.create(userId, { ...validDto, amount: 0.009 })).rejects.toThrow('BR_TXN_08: amount is required and must be >= 0.01');
    });

    it('accepts amount >= 0.01 and trims string fields', async () => {
      const dto: CreateTransactionDto = {
        accountId: 1,
        transactionDate: '2026-08-25',
        type: TransactionType.EXPENSE,
        itemDescription: '  Morning Coffee  ',
        shopName: '  Starbucks  ',
        paymentMethod: '  Apple Pay  ',
        amount: 0.01,
      };

      const result = await engine.create(userId, dto);
      expect(result.data.itemDescription).toBe('Morning Coffee');
      expect(result.data.shopName).toBe('Starbucks');
      expect(result.data.paymentMethod).toBe('Apple Pay');
      expect(result.data.amount).toBe(0.01);
    });
  });

  describe('BR-TXN-09: Allowed transaction type and status', () => {
    const baseDto: CreateTransactionDto = {
      accountId: 1,
      transactionDate: '2026-08-25',
      type: TransactionType.REVENUE,
      itemDescription: 'Bonus',
      shopName: 'Employer',
      paymentMethod: 'Bank Transfer',
      amount: 500000,
    };

    it('pre: allows type Revenue and Expense, rejects other types', async () => {
      await expect(engine.create(userId, { ...baseDto, type: 'Transfer' as any })).rejects.toThrow('BR_TXN_09: type must be Revenue or Expense');
    });

    it('pre: allows status in { Complete, Pending, Failed } and rejects invalid status', async () => {
      await expect(engine.create(userId, { ...baseDto, status: 'Cancelled' as any })).rejects.toThrow('BR_TXN_09: status must be Complete, Pending, or Failed');
    });

    it('post: sets status to Complete by default when status is undefined/omitted', async () => {
      const result = await engine.create(userId, { ...baseDto, status: undefined });
      expect(result.data.status).toBe(TransactionStatus.COMPLETE);
    });

    it('post: preserves explicit status when provided', async () => {
      const pendingResult = await engine.create(userId, { ...baseDto, status: TransactionStatus.PENDING });
      expect(pendingResult.data.status).toBe(TransactionStatus.PENDING);

      const failedResult = await engine.create(userId, { ...baseDto, status: TransactionStatus.FAILED });
      expect(failedResult.data.status).toBe(TransactionStatus.FAILED);
    });
  });

  describe('BR-TXN-10: Optional category must be valid when supplied', () => {
    const baseDto: CreateTransactionDto = {
      accountId: 1,
      transactionDate: '2026-08-25',
      type: TransactionType.REVENUE,
      itemDescription: 'Freelance work',
      shopName: 'Client',
      paymentMethod: 'Bank Transfer',
      amount: 2000000,
    };

    it('pre: allows omitted/undefined category_id and stores undefined', async () => {
      const result = await engine.create(userId, { ...baseDto, category_id: undefined });
      expect(result.data.category_id).toBeUndefined();
    });

    it('pre: rejects non-existent category_id', async () => {
      await expect(engine.create(userId, { ...baseDto, category_id: 999 })).rejects.toThrow('BR_TXN_10: Supplied category_id does not exist');
    });

    it('post: stores and returns category_id when valid category_id is supplied', async () => {
      const result = await engine.create(userId, { ...baseDto, category_id: 1 });
      expect(result.data.category_id).toBe(1);
    });
  });

  describe('BR-TXN-11: Account ownership', () => {
    const baseDto: CreateTransactionDto = {
      accountId: 2, // Belongs to user_id = 99
      transactionDate: '2026-08-25',
      type: TransactionType.EXPENSE,
      itemDescription: 'Dinner',
      shopName: 'Restaurant',
      paymentMethod: 'Cash',
      amount: 100000,
    };

    it('pre: rejects transaction creation when account does not belong to authenticated user', async () => {
      await expect(engine.create(userId, baseDto)).rejects.toThrow('BR_TXN_11: Account not found or not owned by the authenticated user');
    });

    it('pre: rejects when accountId does not exist in the database', async () => {
      await expect(engine.create(userId, { ...baseDto, accountId: 9999 })).rejects.toThrow('BR_TXN_11: Account not found or not owned by the authenticated user');
    });
  });

  describe('BR-TXN-12: Sufficient balance for Expense', () => {
    it('pre: rejects Expense transaction when account balance is less than amount', async () => {
      const dto: CreateTransactionDto = {
        accountId: 1, // balance is 1,000,000
        transactionDate: '2026-08-25',
        type: TransactionType.EXPENSE,
        itemDescription: 'High-end Laptop',
        shopName: 'Apple Store',
        paymentMethod: 'Credit Card',
        amount: 25000000, // exceeds 1,000,000
      };

      await expect(engine.create(userId, dto)).rejects.toThrow('BR_TXN_12: Insufficient balance for Expense transaction');
    });

    it('pre: allows Expense transaction when balance equals or exceeds amount', async () => {
      const dto: CreateTransactionDto = {
        accountId: 1, // balance is 1,000,000
        transactionDate: '2026-08-25',
        type: TransactionType.EXPENSE,
        itemDescription: 'Shopping',
        shopName: 'Store',
        paymentMethod: 'Card',
        amount: 1000000, // exactly equals balance
      };

      const result = await engine.create(userId, dto);
      expect(result.success).toBe(true);
    });

    it('pre: does not enforce balance limit for Revenue transactions', async () => {
      const dto: CreateTransactionDto = {
        accountId: 1,
        transactionDate: '2026-08-25',
        type: TransactionType.REVENUE,
        itemDescription: 'Huge investment return',
        shopName: 'Securities',
        paymentMethod: 'Bank Transfer',
        amount: 100000000,
      };

      const result = await engine.create(userId, dto);
      expect(result.success).toBe(true);
    });
  });

  describe('BR-TXN-13: Account balance adjustment', () => {
    it('post: adds amount to account balance for Revenue transaction', async () => {
      const initialBalance = accounts[0].balance; // 1,000,000
      const amount = 500000;

      await engine.create(userId, {
        accountId: 1,
        transactionDate: '2026-08-25',
        type: TransactionType.REVENUE,
        itemDescription: 'Consulting',
        shopName: 'Partner Corp',
        paymentMethod: 'Transfer',
        amount,
      });

      expect(accounts[0].balance).toBe(initialBalance + amount); // 1,500,000
    });

    it('post: subtracts amount from account balance for Expense transaction', async () => {
      const initialBalance = accounts[0].balance; // 1,000,000
      const amount = 300000;

      await engine.create(userId, {
        accountId: 1,
        transactionDate: '2026-08-25',
        type: TransactionType.EXPENSE,
        itemDescription: 'Groceries',
        shopName: 'Mart',
        paymentMethod: 'Debit Card',
        amount,
      });

      expect(accounts[0].balance).toBe(initialBalance - amount); // 700,000
    });
  });

  describe('BR-TXN-14: Created transaction maps to the request and database', () => {
    it('post: increments transaction count by exactly 1 and stores all required fields', async () => {
      const initialCount = transactions.length;

      const dto: CreateTransactionDto = {
        accountId: 1,
        transactionDate: '2026-08-25',
        type: TransactionType.REVENUE,
        itemDescription: '  Monthly Salary  ',
        shopName: '  Company ABC  ',
        paymentMethod: '  Direct Deposit  ',
        amount: 15000000,
        status: TransactionStatus.COMPLETE,
        category_id: 2,
      };

      const result = await engine.create(userId, dto);

      // post BR_TXN_14_OneNewTransaction
      expect(transactions.length).toBe(initialCount + 1);

      // post BR_TXN_14_PersistedTransaction
      const persisted = transactions.find((t) => t.transaction_id === result.data.transactionId);
      expect(persisted).toBeDefined();
      expect(persisted?.account_id).toBe(1);
      expect(persisted?.transaction_date).toBe('2026-08-25');
      expect(persisted?.type).toBe(TransactionType.REVENUE);
      expect(persisted?.item_description).toBe('Monthly Salary');
      expect(persisted?.shop_name).toBe('Company ABC');
      expect(persisted?.payment_method).toBe('Direct Deposit');
      expect(persisted?.amount).toBe(15000000);
      expect(persisted?.status).toBe(TransactionStatus.COMPLETE);
      expect(persisted?.category_id).toBe(2);
    });
  });

  describe('BR-TXN-15: Atomic transaction creation and rollback', () => {
    it('rolls back and leaves Accounts and Transactions unchanged if persistence fails', async () => {
      const initialBalance = accounts[0].balance;
      const initialTxCount = transactions.length;

      const dto: CreateTransactionDto = {
        accountId: 1,
        transactionDate: '2026-08-25',
        type: TransactionType.EXPENSE,
        itemDescription: 'Bill payment',
        shopName: 'Utility Co',
        paymentMethod: 'Online Banking',
        amount: 200000,
      };

      await expect(engine.create(userId, dto, true)).rejects.toThrow('Database write failure');

      // Atomic constraint: balance and transactions remain unchanged
      expect(accounts[0].balance).toBe(initialBalance);
      expect(transactions.length).toBe(initialTxCount);
    });
  });
});
