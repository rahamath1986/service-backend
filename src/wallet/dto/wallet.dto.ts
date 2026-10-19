import { IsIn, IsNotEmpty, IsNumber, IsOptional, Min } from "class-validator";

export class TopUpDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  amount: number;
}

export class DeductDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  amount: number;
}

export class WorkerWithdrawDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(50)
  amount: number;

  @IsIn(["BANK", "UPI"])
  @IsNotEmpty()
  payoutMethod: "BANK" | "UPI";

  @IsOptional()
  accountDetails?: any;
}
