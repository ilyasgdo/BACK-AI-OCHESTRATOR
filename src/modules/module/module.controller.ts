import { Controller, Get, Param } from '@nestjs/common';
import { ModuleService } from './module.service';

@Controller()
export class ModuleController {
  constructor(private readonly service: ModuleService) {}

  @Get('/module/:id')
  findOne(@Param('id') id: string) {
    return this.service.getDetail(id);
  }
}