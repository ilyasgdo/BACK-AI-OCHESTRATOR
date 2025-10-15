import { IsArray, IsString } from 'class-validator';

export class CreateProfileDto {
  @IsString() job: string;
  @IsString() sector: string;
  @IsString() ai_level: string;
  @IsArray() tools_used: string[];
  @IsString() work_style: string;
}

