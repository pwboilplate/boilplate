/**
 * Creates the test schema (users table) for CI integration tests.
 * Reads PW_DB_TYPE and connection details from environment variables.
 */
const dbType = process.env.PW_DB_TYPE;

async function createPostgresSchema() {
    const { Client } = require('pg');
    const client = new Client({
        host: process.env.PW_DB_HOST,
        port: parseInt(process.env.PW_DB_PORT || '5432'),
        database: process.env.PW_DB_NAME,
        user: process.env.PW_DB_USERNAME,
        password: process.env.PW_DB_PASSWORD,
    });
    await client.connect();
    await client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT,
            email TEXT,
            active BOOLEAN
        )
    `);
    await client.end();
}

async function createMysqlSchema() {
    const mysql = require('mysql2/promise');
    const connection = await mysql.createConnection({
        host: process.env.PW_DB_HOST,
        port: parseInt(process.env.PW_DB_PORT || '3306'),
        database: process.env.PW_DB_NAME,
        user: process.env.PW_DB_USERNAME,
        password: process.env.PW_DB_PASSWORD,
    });
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            email VARCHAR(255),
            active BOOLEAN
        )
    `);
    await connection.end();
}

async function createMssqlSchema() {
    const sql = require('mssql');
    const pool = await sql.connect({
        server: process.env.PW_DB_HOST,
        port: parseInt(process.env.PW_DB_PORT || '1433'),
        database: process.env.PW_DB_NAME,
        user: process.env.PW_DB_USERNAME,
        password: process.env.PW_DB_PASSWORD,
        options: {
            encrypt: process.env.PW_DB_ENCRYPT !== 'false',
            trustServerCertificate: process.env.PW_DB_TRUST_SERVER_CERTIFICATE === 'true',
        },
    });
    await pool.request().query(`
        IF OBJECT_ID(N'users', N'U') IS NULL
        CREATE TABLE users (
            id INT IDENTITY(1,1) PRIMARY KEY,
            name NVARCHAR(255),
            email NVARCHAR(255),
            active BIT
        )
    `);
    await pool.close();
}

async function createSqliteSchema() {
    const Database = require('better-sqlite3');
    const db = new Database(process.env.PW_DB_NAME);
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT,
            active BOOLEAN
        )
    `);
    db.close();
}

async function main() {
    switch (dbType) {
        case 'postgresql':
            await createPostgresSchema();
            break;
        case 'mysql':
            await createMysqlSchema();
            break;
        case 'mssql':
            await createMssqlSchema();
            break;
        case 'sqlite':
            await createSqliteSchema();
            break;
        default:
            console.error(`Unknown DB type: ${dbType}`);
            process.exit(1);
    }
    console.log(`Schema created for ${dbType}`);
}

main().catch((err) => {
    console.error('Failed to create schema:', err.message);
    process.exit(1);
});
