import { Controller, Get, Query, Req, UseGuards, Post } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TransactionListQueryDto } from './dto/transaction-list-query.dto';
import { TransactionService } from './transaction.service';

interface AuthenticatedRequest extends Request {
  user: { userId: number };
}

/** Handles authenticated transaction-history requests. */
@Controller('v1/transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  /** Returns a user-owned, filtered, and paginated transaction list. */
  @Get()
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() query: TransactionListQueryDto,
  ) {
    return this.transactionService.findAllByUserId(request.user.userId, query);
  }

  @Post('seed')
  seedTransactions(@Req() request: AuthenticatedRequest) {
    return this.transactionService.seedData(request.user.userId);
  }
}
