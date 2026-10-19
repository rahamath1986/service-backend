import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export { TicketPriority, TicketStatus } from "@prisma/client";


export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  bookingId?: string;
}

export class EmergencyAlertDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsString()
  jobId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
