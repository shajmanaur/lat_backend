import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { envList } from './constants/constants';
import { toBool } from './utils/utils';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { RolesModule } from './modules/roles/roles.module';
import { RegionsModule } from './modules/regions/regions.module';
import { CoordinatorsModule } from './modules/coordinators/coordinators.module';
import { StudentsModule } from './modules/students/students.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';


@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '../uploads'),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envList,
    }),
    JwtModule.registerAsync({
      global: true, // 👈 Makes it available everywhere without re-import
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>('JWT_SECRETKEY'),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRESIN'),
        },
      }),
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env['TYPEORM_DB_HOST'],
      port: parseInt(process.env['TYPEORM_DB_PORT']),
      username: process.env['TYPEORM_DB_USERNAME'],
      password: process.env['TYPEORM_DB_PASSWORD'],
      database: process.env['TYPEORM_DB_DATABASE'],
      entities: [__dirname + '/entities/*.{ts,js}'],
      synchronize: toBool(process.env['TYPEORM_DB_SYNCHRONIZE']),
      subscribers: [join(__dirname, '**/**.subscriber{.ts,.js}')],
      logging: true,
      autoLoadEntities: true,
    }),
    RolesModule,
    RegionsModule,
    CoordinatorsModule,
    StudentsModule,
    DashboardModule,

  ],
  providers: [],
})
export class AppModule {}
