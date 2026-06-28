// import mysql from 'mysql2/promise';
// import dotenv from 'dotenv';
// dotenv.config();

// const pool = mysql.createPool({
//   host: process.env.DB_HOST || 'localhost',
//   port: process.env.DB_PORT || 3306,
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD || '',
//   database: process.env.DB_NAME || 'investment_agent',
//   waitForConnections: true,
//   connectionLimit: 10,
// });

// export async function initDB() {
//   const conn = await pool.getConnection();
//   try {
//     await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'investment_agent'}\``);
//     await conn.query(`USE \`${process.env.DB_NAME || 'investment_agent'}\``);

//     await conn.query(`
//       CREATE TABLE IF NOT EXISTS users (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         name VARCHAR(100) NOT NULL,
//         email VARCHAR(150) UNIQUE NOT NULL,
//         password_hash VARCHAR(255) NOT NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       )
//     `);

//     await conn.query(`
//       CREATE TABLE IF NOT EXISTS research_reports (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         user_id INT NOT NULL,
//         company_name VARCHAR(200) NOT NULL,
//         verdict ENUM('INVEST','PASS','HOLD') NOT NULL,
//         confidence INT NOT NULL COMMENT '0-100',
//         summary TEXT,
//         full_report LONGTEXT,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
//         INDEX idx_user_id (user_id),
//         INDEX idx_created_at (created_at)
//       )
//     `);

//     console.log('✅ Database initialized');
//   } finally {
//     conn.release();
//   }
// }

// export default pool;


import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function initDB() {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS research_reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_name VARCHAR(200) NOT NULL,
        verdict VARCHAR(10) CHECK (verdict IN ('INVEST','PASS','HOLD')),
        confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
        summary TEXT,
        full_report TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ PostgreSQL initialized");
  } finally {
    client.release();
  }
}

export default pool;