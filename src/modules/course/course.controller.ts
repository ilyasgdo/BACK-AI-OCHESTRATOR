import { Controller, Get, Param } from '@nestjs/common';
import { CourseService } from './course.service';

@Controller()
export class CourseController {
  constructor(private readonly service: CourseService) {}

  @Get('/course/:id')
  findOne(@Param('id') id: string) {
    return this.service.getAggregate(id);
  }
}