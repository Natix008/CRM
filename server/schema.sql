CREATE DATABASE IF NOT EXISTS creditpro_crm;
USE creditpro_crm;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Admin','Credit Specialist','Agent') DEFAULT 'Agent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(50) PRIMARY KEY,
  user_id INT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(30),
  address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(10),
  zip VARCHAR(20),
  date_of_birth DATE,
  ssn_last4 VARCHAR(4),
  enrollment_date DATE,
  status ENUM('Active','Inactive','Completed') DEFAULT 'Active',
  monthly_fee DECIMAL(10,2) DEFAULT 99,
  referral_source VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS credit_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id VARCHAR(50) NOT NULL,
  bureau ENUM('Equifax','Experian','TransUnion') NOT NULL,
  score INT NOT NULL,
  date DATE NOT NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(50) PRIMARY KEY,
  client_id VARCHAR(50) NOT NULL,
  creditor VARCHAR(150) NOT NULL,
  account_number VARCHAR(50),
  account_type VARCHAR(50),
  balance DECIMAL(10,2) DEFAULT 0,
  original_balance DECIMAL(10,2) DEFAULT 0,
  date_opened DATE,
  date_closed DATE,
  status VARCHAR(50),
  bureaus JSON,
  notes TEXT,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS disputes (
  id VARCHAR(50) PRIMARY KEY,
  client_id VARCHAR(50) NOT NULL,
  account_id VARCHAR(50),
  bureau ENUM('Equifax','Experian','TransUnion') NOT NULL,
  reason VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Pending',
  round INT DEFAULT 1,
  date_opened DATE,
  date_updated DATE,
  letter_sent BOOLEAN DEFAULT FALSE,
  letter_date DATE,
  result TEXT,
  notes TEXT,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS letters (
  id VARCHAR(50) PRIMARY KEY,
  client_id VARCHAR(50) NOT NULL,
  dispute_ids JSON,
  type VARCHAR(100),
  addressed_to VARCHAR(50),
  creditor_name VARCHAR(150),
  date_created DATE,
  date_sent DATE,
  content LONGTEXT,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
  id VARCHAR(50) PRIMARY KEY,
  client_id VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  date DATETIME,
  author VARCHAR(100),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(50) PRIMARY KEY,
  client_id VARCHAR(50),
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority ENUM('Low','Medium','High') DEFAULT 'Medium',
  status ENUM('Todo','In Progress','Done') DEFAULT 'Todo',
  due_date DATE,
  assigned_to VARCHAR(100),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);
