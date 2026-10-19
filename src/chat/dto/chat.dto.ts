import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsOptional()
  type?: "TEXT" | "IMAGE";

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
