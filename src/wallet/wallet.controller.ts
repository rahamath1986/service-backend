import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { TopUpDto, DeductDto, WorkerWithdrawDto } from "./dto/wallet.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("Wallet & Payouts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("wallet")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @ApiOperation({
    summary:
      "Get worker wallet overview (balance, pending clearance, bank details)",
  })
  @Get()
  async getWallet(@Request() req: any) {
    return this.walletService.getWorkerWallet(req.user.userId);
  }

  @ApiOperation({ summary: "Get customer/user wallet balance" })
  @Get("balance")
  async getBalance(@Request() req: any) {
    return this.walletService.getBalance(req.user.userId);
  }

  @ApiOperation({ summary: "Get wallet transactions" })
  @Get("transactions")
  async getTransactions(@Request() req: any) {
    return this.walletService.getTransactions(req.user.userId);
  }

  @ApiOperation({
    summary: "Get complete wallet history including payout statuses",
  })
  @Get("history")
  async getWalletHistory(@Request() req: any) {
    return this.walletService.getWalletHistory(req.user.userId);
  }

  @ApiOperation({ summary: "Top-up wallet balance" })
  @Post("topup")
  async addMoney(@Request() req: any, @Body() dto: TopUpDto) {
    return this.walletService.addMoney(req.user.userId, dto.amount);
  }

  @ApiOperation({ summary: "Deduct money from wallet" })
  @Post("deduct")
  async deductMoney(@Request() req: any, @Body() dto: DeductDto) {
    return this.walletService.deductMoney(req.user.userId, dto.amount);
  }

  @ApiOperation({ summary: "Request worker payout withdrawal to Bank/UPI" })
  @Post("withdraw")
  @HttpCode(HttpStatus.OK)
  async withdraw(@Request() req: any, @Body() dto: WorkerWithdrawDto) {
    return this.walletService.withdraw(req.user.userId, dto);
  }
}
