import { Controller, Get } from '@nestjs/common';
import { CoordinatorsService } from './coordinators.service';

@Controller('coordinators')
export class CoordinatorsController {
  constructor(private readonly coordinatorsService: CoordinatorsService) {}

  @Get()
  async findAll() {
    const data = await this.coordinatorsService.findAll();
    return {
      status: 'success',
      data,
    };
  }
}
