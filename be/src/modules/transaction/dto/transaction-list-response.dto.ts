import { TransactionStatus, TransactionType } from '../transaction.entity';

/** Represents one persisted transaction returned by the list endpoint. */
export interface TransactionDto {
  transaction_id: number;
  account_id: number;
  transaction_date: string;
  type: TransactionType;
  item_description: string;
  shop_name: string;
  amount: number;
  payment_method: string;
  status: TransactionStatus;
}

/** Represents a filtered, paginated transaction-history response. */
export interface TransactionListResponseDto {
  data: TransactionDto[];
  total: number;
  hasMore: boolean;
}
