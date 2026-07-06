import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenusController } from './menus.controller';
import { MenusService } from './menus.service';
import { RoleMenuMapping } from '../../entities/role-menu-mapping.entity';
import { MenuMaster } from '../../entities/menu-master.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RoleMenuMapping, MenuMaster])],
  controllers: [MenusController],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule {}
