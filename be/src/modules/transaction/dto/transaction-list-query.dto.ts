import { IsIn, IsOptional, Matches } from 'class-validator';

/** Defines and preserves the raw query values accepted by the transaction-list endpoint. */
export class TransactionListQueryDto {
  @IsOptional()
  @IsIn(['All', 'Revenue', 'Expense'])
  type?: string;

  @IsOptional()
  @Matches(/^\d+$/)
  limit?: string;

  @IsOptional()
  @Matches(/^\d+$/)
  offset?: string;
}
