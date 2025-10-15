import { Controller, Get, Param } from '@nestjs/common';
import { LessonService } from './lesson.service';

@Controller()
export class LessonController {
  constructor(private readonly service: LessonService) {}

  @Get('/lesson/:id')
  findOne(@Param('id') id: string) {
    return this.service.getDetail(id);
  }
}