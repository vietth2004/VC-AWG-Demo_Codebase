import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { TransactionListQueryDto } from './dto/transaction-list-query.dto';
import { TransactionListResponseDto } from './dto/transaction-list-response.dto';
import { TransactionType, TransactionStatus } from './transaction.entity';

describe('TransactionController (Flow 3 & Flow 7)', () => {
  let controller: TransactionController;
  let service: jest.Mocked<TransactionService>;

  beforeEach(() => {
    service = {
      findAllByUserId: jest.fn(),
    } as unknown as jest.Mocked<TransactionService>;

    controller = new TransactionController(service);
  });

  it('delegates to TransactionService.findAllByUserId using authenticated user ID and query parameters', async () => {
    const mockRequest = {
      user: { userId: 1 },
    } as any;

    const mockQuery: TransactionListQueryDto = {
      type: 'All',
      limit: '10',
      offset: '0',
    };

    const expectedResponse: TransactionListResponseDto = {
      data: [
        {
          transaction_id: 101,
          account_id: 2,
          transaction_date: '2026-08-25',
          type: TransactionType.EXPENSE,
          item_description: 'Grocery shopping',
          shop_name: 'Supermarket',
          amount: 500000,
          payment_method: 'Credit Card',
          status: TransactionStatus.COMPLETE,
        },
      ],
      total: 1,
      hasMore: false,
    };

    service.findAllByUserId.mockResolvedValue(expectedResponse);

    const result = await controller.findAll(mockRequest, mockQuery);

    expect(service.findAllByUserId).toHaveBeenCalledWith(1, mockQuery);
    expect(result).toEqual(expectedResponse);
  });
});
