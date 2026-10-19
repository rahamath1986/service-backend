import { IsIn, IsNotEmpty, IsNumber, IsOptional, Min } from "class-validator";

export class WithdrawDto {
  @IsNumber()
  @Min(100)
  amount: number;

  @IsIn(["BANK", "UPI"])
  @IsNotEmpty()
  payoutMethod: "BANK" | "UPI";

  @IsOptional()
  accountDetails?: any;
}
