const { DataSource } = require('typeorm');
require('dotenv').config();

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.TYPEORM_DB_HOST || '192.168.0.131',
  port: parseInt(process.env.TYPEORM_DB_PORT || '3306'),
  username: process.env.TYPEORM_DB_USERNAME || 'lat_second_user',
  password: process.env.TYPEORM_DB_PASSWORD || 'lat@222',
  database: process.env.TYPEORM_DB_DATABASE || 'lat_second_staging',
  entities: [__dirname + '/dist/src/entities/*.entity.js'],
  synchronize: true,
});

AppDataSource.initialize()
  .then(() => {
    console.log('Database synchronized successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error synchronizing database:', err);
    process.exit(1);
  });
