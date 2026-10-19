import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @IsString()
  @IsNotEmpty()
  workerId: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  time: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  paymentMethod?: string;
}

export class UpdateBookingStatusDto {
  @IsString()
  @IsNotEmpty()
  status: "UPCOMING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
}

export class PayBookingDto {
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}
