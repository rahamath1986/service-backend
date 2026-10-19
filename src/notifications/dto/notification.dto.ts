import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  data?: any;

  @IsOptional()
  @IsString()
  workerId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
