'use strict';
const path = require('path');

require('dotenv').config({
  // 這支檔案在 backend/config/，.env 在 backend/.env
  path:
    process.env.NODE_ENV === 'production'
      ? path.resolve(__dirname, '../.env.production')
      : path.resolve(__dirname, '../.env'),
});

const base = {
  dialect: 'mysql',
  timezone: '+08:00',
  define: { underscored: true, freezeTableName: false },
  dialectOptions: { dateStrings: true, typeCast: true },
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
};

module.exports = {
  development: {
    ...base,
    username: process.env.DB_USER || 'root',
    // 即使空字串也要傳，避免 (using password: NO)
    password: process.env.DB_PASS === undefined ? '' : process.env.DB_PASS,
    database: process.env.DB_NAME || 'test',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306, // 你用 3307 就在 .env 設 DB_PORT=3307
  },
  test: {
    ...base,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS === undefined ? '' : process.env.DB_PASS,
    database: process.env.DB_NAME_TEST || 'test_test',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    logging: false,
  },
  production: {
    ...base,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS === undefined ? '' : process.env.DB_PASS,
    database: process.env.DB_NAME_PROD || 'test_prod',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    logging: false,
    pool: { max: 10, min: 1, acquire: 30000, idle: 10000 },
  },
};
