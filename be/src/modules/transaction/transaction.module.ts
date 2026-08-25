import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Transaction } from './transaction.entity';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';

/** Groups transaction-history persistence, authorization, and HTTP handling. */
@Module({
  imports: [TypeOrmModule.forFeature([Transaction, User]), JwtModule.register({})],
  controllers: [TransactionController],
  providers: [TransactionService, JwtAuthGuard],
})
export class TransactionModule {}
