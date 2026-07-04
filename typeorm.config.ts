import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load the .env file
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.TYPEORM_DB_HOST || '127.0.0.1',
  port: parseInt(process.env.TYPEORM_DB_PORT, 10) || 3306,
  username: process.env.TYPEORM_DB_USERNAME || 'root',
  password: process.env.TYPEORM_DB_PASSWORD || '',
  database: process.env.TYPEORM_DB_DATABASE || 'lat_new',
  synchronize: false,
  logging: true,
  entities: [join(__dirname, 'src/entities/*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'src/migrations/*{.ts,.js}')],
  migrationsTableName: 'migrations',
});
