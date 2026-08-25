-- ====================================================================
-- Database Seed Script for 'financial1' Database
-- Use Case: Test "View Transaction History" (Flow 1-8, AF-1, AF-2, AF-3, EF-1, EF-2, EF-3)
-- ====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Clean existing data
TRUNCATE TABLE `Transactions`;
TRUNCATE TABLE `Goals`;
TRUNCATE TABLE `Bills`;
TRUNCATE TABLE `Accounts`;
TRUNCATE TABLE `Categories`;
TRUNCATE TABLE `Users`;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Insert Categories
INSERT INTO `Categories` (`category_id`, `category_name`) VALUES
(1, 'Food & Dining'),
(2, 'Salary & Income'),
(3, 'Shopping & Retail'),
(4, 'Bills & Utilities'),
(5, 'Entertainment'),
(6, 'Transportation'),
(7, 'Investment & Dividend'),
(8, 'Health & Fitness'),
(9, 'Education'),
(10, 'Travel & Vacation'),
(11, 'Groceries'),
(12, 'Freelance & Side Gig');

-- 2. Insert Users (Password: Password123! - Bcrypt Hashed)
-- user_id 1: Nguyen Van A (user@financial.com) - Primary test user with 34 transactions (4 pages)
-- user_id 2: Tran Thi B (empty@financial.com) - Empty user for AF-3 testing (0 transactions)
-- user_id 3: Le Van C (other@financial.com) - Isolated user for checking ownership filtering (3 transactions)
-- user_id 4: Pham Minh Duc (tester@financial.com) - New test user with 15 transactions (2 pages)
INSERT INTO `Users` (`user_id`, `full_name`, `email`, `username`, `password`, `phone_number`, `profile_picture_url`, `total_balance`) VALUES
(1, 'Nguyen Van A', 'user@financial.com', 'nguyenvana', '$2b$10$OcgP5R8t9XmK6D3F9J2Kou3d8hZ8xQY9d0gP8vB1cK2aX4eM7iQ2a', '0901234567', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 65500000.00),
(2, 'Tran Thi B', 'empty@financial.com', 'tranthib', '$2b$10$OcgP5R8t9XmK6D3F9J2Kou3d8hZ8xQY9d0gP8vB1cK2aX4eM7iQ2a', '0912345678', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 0.00),
(3, 'Le Van C', 'other@financial.com', 'levanc', '$2b$10$OcgP5R8t9XmK6D3F9J2Kou3d8hZ8xQY9d0gP8vB1cK2aX4eM7iQ2a', '0987654321', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150', 12000000.00),
(4, 'Pham Minh Duc', 'tester@financial.com', 'phamminhduc', '$2b$10$OcgP5R8t9XmK6D3F9J2Kou3d8hZ8xQY9d0gP8vB1cK2aX4eM7iQ2a', '0934567890', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 88000000.00);

-- 3. Insert Accounts
-- User 1 Accounts
INSERT INTO `Accounts` (`account_id`, `user_id`, `bank_name`, `account_type`, `branch_name`, `account_number_full`, `account_number_last_4`, `balance`) VALUES
(1, 1, 'Vietcombank', 'Checking', 'Chi nhánh Hoàn Kiếm, Hà Nội', '0011004567890', '7890', 45000000.00),
(2, 1, 'Techcombank', 'Savings', 'Chi nhánh Thăng Long, Hà Nội', '19034567890123', '0123', 20000000.00),
(3, 1, 'VPBank', 'Credit Card', 'Chi nhánh Cầu Giấy, Hà Nội', '5200888899994321', '4321', 500000.00),
-- User 3 Accounts
(4, 3, 'MBBank', 'Checking', 'Chi nhánh Ba Đình, Hà Nội', '0888999111222', '1222', 12000000.00),
-- User 4 Accounts
(5, 4, 'BIDV', 'Checking', 'Chi nhánh Quang Trung, Hà Nội', '1241000998877', '8877', 50000000.00),
(6, 4, 'ACB', 'Savings', 'Chi nhánh Hai Bà Trưng, Hà Nội', '228899776655', '6655', 38000000.00);

-- 4. Insert 34 Transactions for User 1 (Accounts 1, 2, 3)
INSERT INTO `Transactions` (`transaction_id`, `account_id`, `transaction_date`, `type`, `item_description`, `shop_name`, `amount`, `payment_method`, `status`, `category_id`, `receipt_id`) VALUES
-- Page 1 (Items 1 - 10)
(1, 1, '2026-08-25', 'Revenue', 'Lương tháng 08/2026', 'Công ty Cổ phần Terra Financial', 35000000.00, 'Bank Transfer', 'Complete', 2, 'REC-20260825-01'),
(2, 3, '2026-08-25', 'Expense', 'Highlands Coffee Phin Sữa Đá', 'Highlands Coffee', 55000.00, 'Apple Pay', 'Complete', 1, 'REC-20260825-02'),
(3, 3, '2026-08-24', 'Expense', 'Mua sắm thực phẩm gia đình tuần', 'WinMart+ Times City', 850000.00, 'Credit Card', 'Complete', 11, 'REC-20260824-01'),
(4, 1, '2026-08-24', 'Revenue', 'Thanh toán dự án thiết kế UI/UX', 'Freelance Client Singapore', 12500000.00, 'Bank Transfer', 'Complete', 12, 'REC-20260824-02'),
(5, 3, '2026-08-23', 'Expense', 'Pizza 4P’s Four Cheese & Pasta', 'Pizza 4P’s Tràng Tiền', 720000.00, 'Credit Card', 'Complete', 1, 'REC-20260823-01'),
(6, 1, '2026-08-22', 'Expense', 'Thanh toán hóa đơn điện sinh hoạt tháng 8', 'EVN Hà Nội', 1450000.00, 'Bank Transfer', 'Complete', 4, 'REC-20260822-01'),
(7, 3, '2026-08-22', 'Expense', 'Vé xem phim Deadpool 3 & Bắp nước', 'CGV Vincom Bà Triệu', 240000.00, 'Apple Pay', 'Complete', 5, 'REC-20260822-02'),
(8, 1, '2026-08-21', 'Expense', 'GrabCar đi gặp đối tác', 'Grab Vietnam', 135000.00, 'E-Wallet', 'Complete', 6, 'REC-20260821-01'),
(9, 2, '2026-08-20', 'Revenue', 'Nhận lãi tiết kiệm kỳ hạn 6 tháng', 'Techcombank Digital', 650000.00, 'Bank Transfer', 'Complete', 7, 'REC-20260820-01'),
(10, 3, '2026-08-20', 'Expense', 'Mua áo sơ mi công sở và quần âu', 'Uniqlo Vincom Phạm Ngọc Thạch', 1490000.00, 'Credit Card', 'Complete', 3, 'REC-20260820-02'),

-- Page 2 (Items 11 - 20)
(11, 1, '2026-08-19', 'Expense', 'Đăng ký gói hội viên Gym 6 tháng', 'California Fitness & Yoga', 5400000.00, 'Bank Transfer', 'Complete', 8, 'REC-20260819-01'),
(12, 3, '2026-08-18', 'Expense', 'Starbucks Caramel Macchiato Venti', 'Starbucks Reserve Nhà Thờ', 115000.00, 'Apple Pay', 'Complete', 1, 'REC-20260818-01'),
(13, 1, '2026-08-17', 'Expense', 'Cước Internet cáp quang FiberVNN', 'VNPT Telecom', 330000.00, 'Bank Transfer', 'Complete', 4, 'REC-20260817-01'),
(14, 3, '2026-08-16', 'Expense', 'Mua sách Clean Architecture & Design Patterns', 'Tiki Trading', 380000.00, 'Credit Card', 'Complete', 9, 'REC-20260816-01'),
(15, 1, '2026-08-15', 'Revenue', 'Hoàn tiền chi tiêu thẻ tín dụng Cashback', 'VPBank Loyalty Rewards', 450000.00, 'Bank Transfer', 'Complete', 2, 'REC-20260815-01'),
(16, 3, '2026-08-15', 'Expense', 'Đơn hàng công nghệ Shopee', 'Shopee Mall - Baseus Official', 620000.00, 'Credit Card', 'Complete', 3, 'REC-20260815-02'),
(17, 1, '2026-08-14', 'Expense', 'Đổ xăng xe máy Petrolimex', 'Petrolimex Cửa Hàng Số 1', 95000.00, 'Cash', 'Complete', 6, 'REC-20260814-01'),
(18, 3, '2026-08-13', 'Expense', 'Giao dịch chuyển tiền mua quà sinh nhật', 'Lazada Vietnam', 890000.00, 'Credit Card', 'Pending', 3, 'REC-20260813-01'),
(19, 1, '2026-08-12', 'Expense', 'Mua thuốc và vitamin gia đình', 'Nhà thuốc Pharmacity', 285000.00, 'Apple Pay', 'Complete', 8, 'REC-20260812-01'),
(20, 2, '2026-08-10', 'Revenue', 'Cổ tức tiền mặt FPT đợt 1', 'Công ty Chứng khoán VNDIRECT', 3200000.00, 'Bank Transfer', 'Complete', 7, 'REC-20260810-01'),

-- Page 3 (Items 21 - 30)
(21, 3, '2026-08-08', 'Expense', 'Buffet nướng Hàn Quốc cuối tuần', 'Gogi House Vincom', 980000.00, 'Credit Card', 'Complete', 1, 'REC-20260808-01'),
(22, 1, '2026-08-05', 'Expense', 'Thanh toán vé máy bay khứ hồi Hà Nội - Đà Nẵng', 'Vietnam Airlines Official', 3600000.00, 'Bank Transfer', 'Complete', 10, 'REC-20260805-01'),
(23, 3, '2026-08-03', 'Expense', 'Phúc Long Trà Đào Sữa & Bánh', 'Phúc Long Coffee & Tea', 110000.00, 'Apple Pay', 'Complete', 1, 'REC-20260803-01'),
(24, 1, '2026-08-01', 'Revenue', 'Thưởng hiệu suất quý 2/2026', 'Công ty Cổ phần Terra Financial', 15000000.00, 'Bank Transfer', 'Complete', 2, 'REC-20260801-01'),
(25, 3, '2026-07-28', 'Expense', 'Bàn phím cơ không dây Keychron K2', 'SiliconZ Store', 1850000.00, 'Credit Card', 'Complete', 3, 'REC-20260728-01'),
(26, 1, '2026-07-25', 'Expense', 'Phí bảo trì chung cư tháng 7', 'Ban Quản Lý Tòa Nhà', 650000.00, 'Bank Transfer', 'Complete', 4, 'REC-20260725-01'),
(27, 3, '2026-07-22', 'Expense', 'Giao dịch lỗi qua cổng thanh toán', 'Steam Games Store', 450000.00, 'Credit Card', 'Failed', 5, 'REC-20260722-01'),
(28, 1, '2026-07-20', 'Revenue', 'Thu nhập tư vấn kỹ thuật hệ thống', 'Fintech Advisory Group', 8000000.00, 'Bank Transfer', 'Complete', 12, 'REC-20260720-01'),
(29, 3, '2026-07-15', 'Expense', 'Khách sạn Melia Vinpearl Danang', 'Melia Hotels International', 4200000.00, 'Credit Card', 'Complete', 10, 'REC-20260715-01'),
(30, 1, '2026-07-10', 'Expense', 'Nước hoa & Mỹ phẩm quà tặng', 'Sephora Vietnam', 2100000.00, 'Debit Card', 'Complete', 3, 'REC-20260710-01'),

-- Page 4 (Items 31 - 34)
(31, 2, '2026-07-05', 'Revenue', 'Tiền lãi đầu tư quỹ mở Dragon Capital', 'Dragon Capital Vietnam', 1800000.00, 'Bank Transfer', 'Complete', 7, 'REC-20260705-01'),
(32, 3, '2026-07-02', 'Expense', 'Thanh toán gói Netflix Premium 4K', 'Netflix Services', 260000.00, 'Credit Card', 'Complete', 5, 'REC-20260702-01'),
(33, 1, '2026-06-28', 'Expense', 'Ăn tối nhà hàng Dim Sum', 'San Fu Lou', 680000.00, 'Apple Pay', 'Complete', 1, 'REC-20260628-01'),
(34, 3, '2026-06-25', 'Expense', 'Đăng ký khóa học AWS Solutions Architect', 'Udemy Online Courses', 349000.00, 'Credit Card', 'Complete', 9, 'REC-20260625-01');

-- 5. Insert 3 Transactions for User 3 (Isolation Check)
INSERT INTO `Transactions` (`transaction_id`, `account_id`, `transaction_date`, `type`, `item_description`, `shop_name`, `amount`, `payment_method`, `status`, `category_id`, `receipt_id`) VALUES
(35, 4, '2026-08-25', 'Revenue', 'Lương nhân sự IT', 'Tập đoàn Viettel', 28000000.00, 'Bank Transfer', 'Complete', 2, 'REC-U3-01'),
(36, 4, '2026-08-23', 'Expense', 'Mua bàn làm việc Ergonomic', 'ErgoHome Store', 4500000.00, 'Debit Card', 'Complete', 3, 'REC-U3-02'),
(37, 4, '2026-08-20', 'Expense', 'Cà phê sáng', 'The Coffee House', 50000.00, 'Cash', 'Complete', 1, 'REC-U3-03');

-- 6. Insert 15 Transactions for User 4 (tester@financial.com - 2 pages)
INSERT INTO `Transactions` (`transaction_id`, `account_id`, `transaction_date`, `type`, `item_description`, `shop_name`, `amount`, `payment_method`, `status`, `category_id`, `receipt_id`) VALUES
-- Page 1 (Items 38 - 47)
(38, 5, '2026-08-25', 'Revenue', 'Lương tháng 08/2026', 'Tập đoàn Công nghệ FPT', 40000000.00, 'Bank Transfer', 'Complete', 2, 'REC-U4-01'),
(39, 5, '2026-08-25', 'Expense', 'Buffet lẩu băng chuyền Kichi Kichi', 'Kichi Kichi Vincom', 599000.00, 'Apple Pay', 'Complete', 1, 'REC-U4-02'),
(40, 5, '2026-08-24', 'Expense', 'Mua sắm thực phẩm siêu thị', 'Co.opmart Hà Đông', 750000.00, 'Debit Card', 'Complete', 11, 'REC-U4-03'),
(41, 5, '2026-08-23', 'Expense', 'Highlands Freeze Trà Xanh', 'Highlands Coffee', 65000.00, 'Apple Pay', 'Complete', 1, 'REC-U4-04'),
(42, 5, '2026-08-22', 'Expense', 'Thanh toán tiền điện sinh hoạt', 'EVN Hà Nội', 1200000.00, 'Bank Transfer', 'Complete', 4, 'REC-U4-05'),
(43, 5, '2026-08-21', 'Expense', 'Tai nghe chống ồn Sony WH-1000XM4', 'Sony Center', 2990000.00, 'Credit Card', 'Complete', 3, 'REC-U4-06'),
(44, 5, '2026-08-20', 'Revenue', 'Thưởng KPI xuất sắc quý 2', 'Tập đoàn Công nghệ FPT', 10000000.00, 'Bank Transfer', 'Complete', 2, 'REC-U4-07'),
(45, 5, '2026-08-18', 'Expense', 'GrabCar đưa đón sân bay Nội Bài', 'Grab Vietnam', 250000.00, 'E-Wallet', 'Complete', 6, 'REC-U4-08'),
(46, 5, '2026-08-16', 'Expense', 'Bữa trưa đặt qua ShopeeFood', 'ShopeeFood Vietnam', 120000.00, 'Apple Pay', 'Complete', 1, 'REC-U4-09'),
(47, 6, '2026-08-15', 'Revenue', 'Nhận lãi tiền gửi tiết kiệm ACB', 'ACB Digital Banking', 1200000.00, 'Bank Transfer', 'Complete', 7, 'REC-U4-10'),

-- Page 2 (Items 48 - 52)
(48, 5, '2026-08-12', 'Expense', 'Sách nghệ thuật đầu tư Dhandho', 'Tiki Trading', 185000.00, 'Credit Card', 'Pending', 9, 'REC-U4-11'),
(49, 5, '2026-08-10', 'Revenue', 'Thu nhập kinh doanh online', 'Khách hàng chuyển khoản', 3500000.00, 'Bank Transfer', 'Complete', 12, 'REC-U4-12'),
(50, 5, '2026-08-08', 'Expense', 'Đổ xăng ô tô cuối tuần', 'Petrolimex Sông Hồng', 800000.00, 'Cash', 'Complete', 6, 'REC-U4-13'),
(51, 5, '2026-08-05', 'Revenue', 'Hoàn tiền chi tiêu BIDV Cashback', 'BIDV Loyalty Hub', 300000.00, 'Bank Transfer', 'Complete', 2, 'REC-U4-14'),
(52, 5, '2026-08-02', 'Expense', 'Giao dịch qua cổng thanh toán quốc tế lỗi', 'Epic Games Store', 450000.00, 'Credit Card', 'Failed', 5, 'REC-U4-15');
