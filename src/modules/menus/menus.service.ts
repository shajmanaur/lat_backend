import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleMenuMapping } from '../../entities/role-menu-mapping.entity';

@Injectable()
export class MenusService {
  constructor(
    @InjectRepository(RoleMenuMapping)
    private readonly roleMenuMappingRepo: Repository<RoleMenuMapping>,
  ) {}

  async getMyMenus(roleId: number) {
    const mappings = await this.roleMenuMappingRepo.find({
      where: { role_id: roleId, status: true },
      relations: ['menu'],
      order: {
        menu: {
          priority: 'ASC',
        },
      },
    });

    // Extract the menu entities and group them by menu_remarks (which we use as category)
    const menus = mappings
      .filter((m) => m.menu && m.menu.status)
      .map((m) => m.menu);

    return menus;
  }
}
