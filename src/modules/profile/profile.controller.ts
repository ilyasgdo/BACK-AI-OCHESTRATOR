import { Body, Controller, Post } from '@nestjs/common';
import { CreateProfileDto } from './dto/create-profile.dto';
import { ProfileService } from './profile.service';

@Controller()
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  @Post('/profile')
  create(@Body() dto: CreateProfileDto) {
    return this.service.create(dto);
  }
}