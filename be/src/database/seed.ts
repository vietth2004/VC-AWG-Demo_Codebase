import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { User } from '../modules/user/user.entity';
import { Account, AccountType } from '../modules/account/account.entity';
import { Category } from '../modules/category/category.entity';
import { Transaction, TransactionStatus, TransactionType } from '../modules/transaction/transaction.entity';
import { Bill } from '../modules/bill/bill.entity';
import { Goal, GoalType } from '../modules/goal/goal.entity';

// Load .env file manually if exists
function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

/**
 * Initializes database connection and seeds comprehensive test data
 * for testing the "View Transaction History" feature and related workflows.
 */
async function runSeed() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_DATABASE ?? 'financial1',
    entities: [User, Account, Category, Transaction, Bill, Goal],
    synchronize: false,
  });

  console.log('Connecting to database...');
  await dataSource.initialize();
  console.log('Database connected successfully.');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    console.log('Clearing old transaction test data...');
    // Disable foreign key checks for clean truncation/deletion
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0;');
    await queryRunner.query('TRUNCATE TABLE `Transactions`;');
    await queryRunner.query('TRUNCATE TABLE `Goals`;');
    await queryRunner.query('TRUNCATE TABLE `Bills`;');
    await queryRunner.query('TRUNCATE TABLE `Accounts`;');
    await queryRunner.query('TRUNCATE TABLE `Categories`;');
    await queryRunner.query('TRUNCATE TABLE `Users`;');
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1;');

    const userRepo = dataSource.getRepository(User);
    const accountRepo = dataSource.getRepository(Account);
    const categoryRepo = dataSource.getRepository(Category);
    const transactionRepo = dataSource.getRepository(Transaction);

    console.log('1. Seeding Categories...');
    const categoriesData = [
      { categoryName: 'Food & Dining' },
      { categoryName: 'Salary & Income' },
      { categoryName: 'Shopping & Retail' },
      { categoryName: 'Bills & Utilities' },
      { categoryName: 'Entertainment' },
      { categoryName: 'Transportation' },
      { categoryName: 'Investment & Dividend' },
      { categoryName: 'Health & Fitness' },
      { categoryName: 'Education' },
      { categoryName: 'Travel & Vacation' },
      { categoryName: 'Groceries' },
      { categoryName: 'Freelance & Side Gig' },
    ];
    const savedCategories = await categoryRepo.save(categoriesData);
    console.log(`✓ Inserted ${savedCategories.length} categories.`);

    const catMap = new Map<string, number>();
    savedCategories.forEach((cat) => catMap.set(cat.categoryName, cat.categoryId));

    console.log('2. Seeding Users (Password: Password123!)...');
    const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

    // User 1: Primary active user with rich transaction history
    const user1 = await userRepo.save({
      fullName: 'Nguyen Van A',
      email: 'user@financial.com',
      username: 'nguyenvana',
      password: defaultPasswordHash,
      phoneNumber: '0901234567',
      profilePictureUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      totalBalance: 65500000,
    });

    // User 2: Empty user for testing AF-3 (No transactions / No accounts empty state)
    const user2 = await userRepo.save({
      fullName: 'Tran Thi B',
      email: 'empty@financial.com',
      username: 'tranthib',
      password: defaultPasswordHash,
      phoneNumber: '0912345678',
      profilePictureUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      totalBalance: 0,
    });

    // User 3: Another user with their own accounts to test user isolation (Flow 5)
    const user3 = await userRepo.save({
      fullName: 'Le Van C',
      email: 'other@financial.com',
      username: 'levanc',
      password: defaultPasswordHash,
      phoneNumber: '0987654321',
      profilePictureUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      totalBalance: 12000000,
    });

    // User 4: New test user with 15 transactions (2 pages of pagination)
    const user4 = await userRepo.save({
      fullName: 'Pham Minh Duc',
      email: 'tester@financial.com',
      username: 'phamminhduc',
      password: defaultPasswordHash,
      phoneNumber: '0934567890',
      profilePictureUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      totalBalance: 88000000,
    });

    console.log('✓ Inserted 4 users:');
    console.log('   - user@financial.com (Primary test user with 34 transactions)');
    console.log('   - tester@financial.com (New test user with 15 transactions)');
    console.log('   - empty@financial.com (Empty state test user - 0 transactions)');
    console.log('   - other@financial.com (Isolation test user - 3 transactions)');

    console.log('3. Seeding Accounts...');
    const user1Accounts = await accountRepo.save([
      {
        userId: user1.userId,
        bankName: 'Vietcombank',
        accountType: AccountType.CHECKING,
        branchName: 'Chi nhánh Hoàn Kiếm, Hà Nội',
        accountNumberFull: '0011004567890',
        accountNumberLast4: '7890',
        balance: 45000000,
      },
      {
        userId: user1.userId,
        bankName: 'Techcombank',
        accountType: AccountType.SAVINGS,
        branchName: 'Chi nhánh Thăng Long, Hà Nội',
        accountNumberFull: '19034567890123',
        accountNumberLast4: '0123',
        balance: 20000000,
      },
      {
        userId: user1.userId,
        bankName: 'VPBank',
        accountType: AccountType.CREDIT_CARD,
        branchName: 'Chi nhánh Cầu Giấy, Hà Nội',
        accountNumberFull: '5200888899994321',
        accountNumberLast4: '4321',
        balance: 500000,
      },
    ]);

    const user3Accounts = await accountRepo.save([
      {
        userId: user3.userId,
        bankName: 'MBBank',
        accountType: AccountType.CHECKING,
        branchName: 'Chi nhánh Ba Đình, Hà Nội',
        accountNumberFull: '0888999111222',
        accountNumberLast4: '1222',
        balance: 12000000,
      },
    ]);

    const user4Accounts = await accountRepo.save([
      {
        userId: user4.userId,
        bankName: 'BIDV',
        accountType: AccountType.CHECKING,
        branchName: 'Chi nhánh Quang Trung, Hà Nội',
        accountNumberFull: '1241000998877',
        accountNumberLast4: '8877',
        balance: 50000000,
      },
      {
        userId: user4.userId,
        bankName: 'ACB',
        accountType: AccountType.SAVINGS,
        branchName: 'Chi nhánh Hai Bà Trưng, Hà Nội',
        accountNumberFull: '228899776655',
        accountNumberLast4: '6655',
        balance: 38000000,
      },
    ]);
    console.log(`✓ Inserted ${user1Accounts.length + user3Accounts.length + user4Accounts.length} accounts.`);

    console.log('4. Seeding 34 Transactions for User 1 (Spanning multiple dates, categories, types, and statuses)...');

    const vcbAcc = user1Accounts[0].accountId;
    const tcbAcc = user1Accounts[1].accountId;
    const vpAcc = user1Accounts[2].accountId;

    const user1Transactions: Partial<Transaction>[] = [
      // Page 1 (Items 1 - 10) - Most recent
      {
        accountId: vcbAcc,
        transactionDate: new Date('2026-08-25'),
        type: TransactionType.REVENUE,
        itemDescription: 'Lương tháng 08/2026',
        shopName: 'Công ty Cổ phần Terra Financial',
        amount: 35000000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Salary & Income'),
      },
      {
        accountId: vpAcc,
        transactionDate: new Date('2026-08-25'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Highlands Coffee Phin Sữa Đá',
        shopName: 'Highlands Coffee',
        amount: 55000,
        paymentMethod: 'Apple Pay',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Food & Dining'),
      },
      {
        accountId: vpAcc,
        transactionDate: new Date('2026-08-24'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Mua sắm thực phẩm gia đình tuần',
        shopName: 'WinMart+ Times City',
        amount: 850000,
        paymentMethod: 'Credit Card',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Groceries'),
      },
      {
        accountId: vcbAcc,
        transactionDate: new Date('2026-08-24'),
        type: TransactionType.REVENUE,
        itemDescription: 'Thanh toán dự án thiết kế UI/UX',
        shopName: 'Freelance Client Singapore',
        amount: 12500000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Freelance & Side Gig'),
      },
      {
        accountId: vpAcc,
        transactionDate: new Date('2026-08-23'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Pizza 4P’s Four Cheese & Pasta',
        shopName: 'Pizza 4P’s Tràng Tiền',
        amount: 720000,
        paymentMethod: 'Credit Card',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Food & Dining'),
      },
      {
        accountId: vcbAcc,
        transactionDate: new Date('2026-08-22'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Thanh toán hóa đơn điện sinh hoạt tháng 8',
        shopName: 'EVN Hà Nội',
        amount: 1450000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Bills & Utilities'),
      },
      {
        accountId: vpAcc,
        transactionDate: new Date('2026-08-22'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Vé xem phim Deadpool 3 & Bắp nước',
        shopName: 'CGV Vincom Bà Triệu',
        amount: 240000,
        paymentMethod: 'Apple Pay',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Entertainment'),
      },
      {
        accountId: vcbAcc,
        transactionDate: new Date('2026-08-21'),
        type: TransactionType.EXPENSE,
        itemDescription: 'GrabCar đi gặp đối tác',
        shopName: 'Grab Vietnam',
        amount: 135000,
        paymentMethod: 'E-Wallet',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Transportation'),
      },
      {
        accountId: tcbAcc,
        transactionDate: new Date('2026-08-20'),
        type: TransactionType.REVENUE,
        itemDescription: 'Nhận lãi tiết kiệm kỳ hạn 6 tháng',
        shopName: 'Techcombank Digital',
        amount: 650000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Investment & Dividend'),
      },
      {
        accountId: vpAcc,
        transactionDate: new Date('2026-08-20'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Mua áo sơ mi công sở và quần âu',
        shopName: 'Uniqlo Vincom Phạm Ngọc Thạch',
        amount: 1490000,
        paymentMethod: 'Credit Card',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Shopping & Retail'),
      },

      // Page 2 (Items 11 - 20)
      {
        accountId: vcbAcc,
        transactionDate: new Date('2026-08-19'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Đăng ký gói hội viên Gym 6 tháng',
        shopName: 'California Fitness & Yoga',
        amount: 5400000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Health & Fitness'),
      },
      {
        accountId: vpAcc,
        transactionDate: new Date('2026-08-18'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Starbucks Caramel Macchiato Venti',
        shopName: 'Starbucks Reserve Nhà Thờ',
        amount: 115000,
        paymentMethod: 'Apple Pay',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Food & Dining'),
      },
      {
        accountId: vcbAcc,
        transactionDate: new Date('2026-08-17'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Cước Internet cáp quang FiberVNN',
        shopName: 'VNPT Telecom',
        amount: 330000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Bills & Utilities'),
      },
      {
        accountId: vpAcc,
        transactionDate: new Date('2026-08-16'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Mua sách Clean Architecture & Design Patterns',
        shopName: 'Tiki Trading',
        amount: 380000,
        paymentMethod: 'Credit Card',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Education'),
      },
      {
        accountId: vcbAcc,
        transactionDate: new Date('2026-08-15'),
        type: TransactionType.REVENUE,
        itemDescription: 'Hoàn tiền chi tiêu thẻ tín dụng Cashback',
        shopName: 'VPBank Loyalty Rewards',
        amount: 450000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Salary & Income'),
      },
      {
        accountId: vpAcc,
        transactionDate: new Date('2026-08-15'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Đơn hàng công nghệ Shopee',
        shopName: 'Shopee Mall - Baseus Official',
        amount: 620000,
        paymentMethod: 'Credit Card',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Shopping & Retail'),
      },
      {
        accountId: vcbAcc,
        transactionDate: new Date('2026-08-14'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Đổ xăng xe máy Petrolimex',
        shopName: 'Petrolimex Cửa Hàng Số 1',
        amount: 95000,
        paymentMethod: 'Cash',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Transportation'),
      },
      {
        accountId: vpAcc,
        transactionDate: new Date('2026-08-13'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Giao dịch chuyển tiền mua quà sinh nhật',
        shopName: 'Lazada Vietnam',
        amount: 890000,
        paymentMethod: 'Credit Card',
        status: TransactionStatus.PENDING,
        categoryId: catMap.get('Shopping & Retail'),
      },
      {
        accountId: vcbAcc,
        transactionDate: new Date('2026-08-12'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Mua thuốc và vitamin gia đình',
        shopName: 'Nhà thuốc Pharmacity',
        amount: 285000,
        paymentMethod: 'Apple Pay',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Health & Fitness'),
      },
      {
        accountId: tcbAcc,
        transactionDate: new Date('2026-08-10'),
        type: TransactionType.REVENUE,
        itemDescription: 'Cổ tức tiền mặt FPT đợt 1',
        shopName: 'Công ty Chứng khoán VNDIRECT',
        amount: 3200000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Investment & Dividend'),
      },

      // Page 3 (Items 21 - 30)
      {
        accountId: vpAcc,
        transactionDate: new Date('2026-08-08'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Buffet nướng Hàn Quốc cuối tuần',
        shopName: 'Gogi House Vincom',
        amount: 980000,
        paymentMethod: 'Credit Card',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Food & Dining'),
      },
      {
        accountId: vcbAcc,
        transactionDate: new Date('2026-08-05'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Thanh toán vé máy bay khứ hồi Hà Nội - Đà Nẵng',
        shopName: 'Vietnam Airlines Official',
        amount: 3600000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Travel & Vacation'),
      },
      {
        accountId: vpAcc,
        transactionDate: new Date('2026-08-03'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Phúc Long Trà Đào Sữa & Bánh',
        shopName: 'Phúc Long Coffee & Tea',
        amount: 110000,
        paymentMethod: 'Apple Pay',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Food & Dining'),
      },
      {
        accountId: vcbAcc,
        transactionDate: new Date('2026-08-01'),
        type: TransactionType.REVENUE,
        itemDescription: 'Thưởng hiệu suất quý 2/2026',
        shopName: 'Công ty Cổ phần Terra Financial',
        amount: 15000000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Salary & Income'),
      },
      {
        accountId: vpAcc,
        transactionDate: new Date('2026-07-28'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Bàn phím cơ không dây Keychron K2',
        shopName: 'SiliconZ Store',
        amount: 1850000,
        paymentMethod: 'Credit Card',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Shopping & Retail'),
      },
      {
        accountId: vcbAcc,
        transactionDate: new Date('2026-07-25'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Phí bảo trì chung cư tháng 7',
        shopName: 'Ban Quản Lý Tòa Nhà',
        amount: 650000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Bills & Utilities'),
      },
      {
        accountId: vpAcc,
        transactionDate: new Date('2026-07-22'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Giao dịch lỗi qua cổng thanh toán',
        shopName: 'Steam Games Store',
        amount: 450000,
        paymentMethod: 'Credit Card',
        status: TransactionStatus.FAILED,
        categoryId: catMap.get('Entertainment'),
      },
      {
        accountId: vcbAcc,
        transactionDate: new Date('2026-07-20'),
        type: TransactionType.REVENUE,
        itemDescription: 'Thu nhập tư vấn kỹ thuật hệ thống',
        shopName: 'Fintech Advisory Group',
        amount: 8000000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Freelance & Side Gig'),
      },
      {
        accountId: vpAcc,
        transactionDate: new Date('2026-07-15'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Khách sạn Melia Vinpearl Danang',
        shopName: 'Melia Hotels International',
        amount: 4200000,
        paymentMethod: 'Credit Card',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Travel & Vacation'),
      },
      {
        accountId: vcbAcc,
        transactionDate: new Date('2026-07-10'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Nước hoa & Mỹ phẩm quà tặng',
        shopName: 'Sephora Vietnam',
        amount: 2100000,
        paymentMethod: 'Debit Card',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Shopping & Retail'),
      },

      // Page 4 (Items 31 - 34)
      {
        accountId: tcbAcc,
        transactionDate: new Date('2026-07-05'),
        type: TransactionType.REVENUE,
        itemDescription: 'Tiền lãi đầu tư quỹ mở Dragon Capital',
        shopName: 'Dragon Capital Vietnam',
        amount: 1800000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Investment & Dividend'),
      },
      {
        accountId: vpAcc,
        transactionDate: new Date('2026-07-02'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Thanh toán gói Netflix Premium 4K',
        shopName: 'Netflix Services',
        amount: 260000,
        paymentMethod: 'Credit Card',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Entertainment'),
      },
      {
        accountId: vcbAcc,
        transactionDate: new Date('2026-06-28'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Ăn tối nhà hàng Dim Sum',
        shopName: 'San Fu Lou',
        amount: 680000,
        paymentMethod: 'Apple Pay',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Food & Dining'),
      },
      {
        accountId: vpAcc,
        transactionDate: new Date('2026-06-25'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Đăng ký khóa học AWS Solutions Architect',
        shopName: 'Udemy Online Courses',
        amount: 349000,
        paymentMethod: 'Credit Card',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Education'),
      },
    ];

    await transactionRepo.save(user1Transactions);
    console.log(`✓ Inserted ${user1Transactions.length} transactions for User 1.`);

    console.log('5. Seeding 3 Transactions for User 3 (Isolation verification)...');
    const user3Transactions: Partial<Transaction>[] = [
      {
        accountId: user3Accounts[0].accountId,
        transactionDate: new Date('2026-08-25'),
        type: TransactionType.REVENUE,
        itemDescription: 'Lương nhân sự IT',
        shopName: 'Tập đoàn Viettel',
        amount: 28000000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Salary & Income'),
      },
      {
        accountId: user3Accounts[0].accountId,
        transactionDate: new Date('2026-08-23'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Mua bàn làm việc Ergonomic',
        shopName: 'ErgoHome Store',
        amount: 4500000,
        paymentMethod: 'Debit Card',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Shopping & Retail'),
      },
      {
        accountId: user3Accounts[0].accountId,
        transactionDate: new Date('2026-08-20'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Cà phê sáng',
        shopName: 'The Coffee House',
        amount: 50000,
        paymentMethod: 'Cash',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Food & Dining'),
      },
    ];
    await transactionRepo.save(user3Transactions);
    console.log(`✓ Inserted ${user3Transactions.length} transactions for User 3.`);

    console.log('6. Seeding 15 Transactions for User 4 (tester@financial.com)...');
    const u4BidvAcc = user4Accounts[0].accountId;
    const u4AcbAcc = user4Accounts[1].accountId;

    const user4Transactions: Partial<Transaction>[] = [
      // Page 1 (10 transactions)
      {
        accountId: u4BidvAcc,
        transactionDate: new Date('2026-08-25'),
        type: TransactionType.REVENUE,
        itemDescription: 'Lương tháng 08/2026',
        shopName: 'Tập đoàn Công nghệ FPT',
        amount: 40000000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Salary & Income'),
      },
      {
        accountId: u4BidvAcc,
        transactionDate: new Date('2026-08-25'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Buffet lẩu băng chuyền Kichi Kichi',
        shopName: 'Kichi Kichi Vincom',
        amount: 599000,
        paymentMethod: 'Apple Pay',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Food & Dining'),
      },
      {
        accountId: u4BidvAcc,
        transactionDate: new Date('2026-08-24'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Mua sắm thực phẩm siêu thị',
        shopName: 'Co.opmart Hà Đông',
        amount: 750000,
        paymentMethod: 'Debit Card',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Groceries'),
      },
      {
        accountId: u4BidvAcc,
        transactionDate: new Date('2026-08-23'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Highlands Freeze Trà Xanh',
        shopName: 'Highlands Coffee',
        amount: 65000,
        paymentMethod: 'Apple Pay',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Food & Dining'),
      },
      {
        accountId: u4BidvAcc,
        transactionDate: new Date('2026-08-22'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Thanh toán tiền điện sinh hoạt',
        shopName: 'EVN Hà Nội',
        amount: 1200000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Bills & Utilities'),
      },
      {
        accountId: u4BidvAcc,
        transactionDate: new Date('2026-08-21'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Tai nghe chống ồn Sony WH-1000XM4',
        shopName: 'Sony Center',
        amount: 2990000,
        paymentMethod: 'Credit Card',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Shopping & Retail'),
      },
      {
        accountId: u4BidvAcc,
        transactionDate: new Date('2026-08-20'),
        type: TransactionType.REVENUE,
        itemDescription: 'Thưởng KPI xuất sắc quý 2',
        shopName: 'Tập đoàn Công nghệ FPT',
        amount: 10000000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Salary & Income'),
      },
      {
        accountId: u4BidvAcc,
        transactionDate: new Date('2026-08-18'),
        type: TransactionType.EXPENSE,
        itemDescription: 'GrabCar đưa đón sân bay Nội Bài',
        shopName: 'Grab Vietnam',
        amount: 250000,
        paymentMethod: 'E-Wallet',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Transportation'),
      },
      {
        accountId: u4BidvAcc,
        transactionDate: new Date('2026-08-16'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Bữa trưa đặt qua ShopeeFood',
        shopName: 'ShopeeFood Vietnam',
        amount: 120000,
        paymentMethod: 'Apple Pay',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Food & Dining'),
      },
      {
        accountId: u4AcbAcc,
        transactionDate: new Date('2026-08-15'),
        type: TransactionType.REVENUE,
        itemDescription: 'Nhận lãi tiền gửi tiết kiệm ACB',
        shopName: 'ACB Digital Banking',
        amount: 1200000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Investment & Dividend'),
      },

      // Page 2 (5 transactions)
      {
        accountId: u4BidvAcc,
        transactionDate: new Date('2026-08-12'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Sách nghệ thuật đầu tư Dhandho',
        shopName: 'Tiki Trading',
        amount: 185000,
        paymentMethod: 'Credit Card',
        status: TransactionStatus.PENDING,
        categoryId: catMap.get('Education'),
      },
      {
        accountId: u4BidvAcc,
        transactionDate: new Date('2026-08-10'),
        type: TransactionType.REVENUE,
        itemDescription: 'Thu nhập kinh doanh online',
        shopName: 'Khách hàng chuyển khoản',
        amount: 3500000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Freelance & Side Gig'),
      },
      {
        accountId: u4BidvAcc,
        transactionDate: new Date('2026-08-08'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Đổ xăng ô tô cuối tuần',
        shopName: 'Petrolimex Sông Hồng',
        amount: 800000,
        paymentMethod: 'Cash',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Transportation'),
      },
      {
        accountId: u4BidvAcc,
        transactionDate: new Date('2026-08-05'),
        type: TransactionType.REVENUE,
        itemDescription: 'Hoàn tiền chi tiêu BIDV Cashback',
        shopName: 'BIDV Loyalty Hub',
        amount: 300000,
        paymentMethod: 'Bank Transfer',
        status: TransactionStatus.COMPLETE,
        categoryId: catMap.get('Salary & Income'),
      },
      {
        accountId: u4BidvAcc,
        transactionDate: new Date('2026-08-02'),
        type: TransactionType.EXPENSE,
        itemDescription: 'Giao dịch qua cổng thanh toán quốc tế lỗi',
        shopName: 'Epic Games Store',
        amount: 450000,
        paymentMethod: 'Credit Card',
        status: TransactionStatus.FAILED,
        categoryId: catMap.get('Entertainment'),
      },
    ];

    await transactionRepo.save(user4Transactions);
    console.log(`✓ Inserted ${user4Transactions.length} transactions for User 4.`);

    console.log('\n=============================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('=============================================');
    console.log('Test Accounts Information:');
    console.log('---------------------------------------------');
    console.log('1. Primary Account (34 Transactions - 4 pages):');
    console.log('   Email: user@financial.com');
    console.log('   Password: Password123!');
    console.log('   Revenue: 8 transactions | Expense: 26 transactions');
    console.log('---------------------------------------------');
    console.log('2. New Test Account (15 Transactions - 2 pages):');
    console.log('   Email: tester@financial.com');
    console.log('   Password: Password123!');
    console.log('   Revenue: 5 transactions | Expense: 10 transactions');
    console.log('   Status: 13 Complete, 1 Pending, 1 Failed');
    console.log('---------------------------------------------');
    console.log('3. Empty Account (0 Transactions - AF-3 Empty State):');
    console.log('   Email: empty@financial.com');
    console.log('   Password: Password123!');
    console.log('---------------------------------------------');
    console.log('4. Isolated Account (Separate Data - User Isolation Check):');
    console.log('   Email: other@financial.com');
    console.log('   Password: Password123!');
    console.log('=============================================\n');
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

runSeed().catch((err) => {
  console.error(err);
  process.exit(1);
});
