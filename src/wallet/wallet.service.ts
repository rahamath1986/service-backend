import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WorkerWithdrawDto } from "./dto/wallet.dto";
import { PayoutStatus } from "../common/enums/payout-status.enum";

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string): Promise<{ balance: number }> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    return { balance: wallet?.balance ?? 0.0 };
  }

  async getTransactions(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return wallet?.transactions ?? [];
  }

  async addMoney(userId: string, amount: number) {
    return this.prisma.$transaction(async (tx) => {
      let wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await tx.wallet.create({
          data: { userId, balance: 0 },
        });
      }

      const updated = await tx.wallet.update({
        where: { userId },
        data: {
          balance: { increment: amount },
          transactions: {
            create: {
              title: "Wallet Top-up",
              subtitle: "Added via UPI",
              amount,
              date: new Date().toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
              isCredit: true,
            },
          },
        },
      });

      return { balance: updated.balance };
    });
  }

  async deductMoney(userId: string, amount: number) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet || wallet.balance < amount) {
        throw new BadRequestException("Insufficient wallet balance");
      }

      const updated = await tx.wallet.update({
        where: { userId },
        data: {
          balance: { decrement: amount },
          transactions: {
            create: {
              title: "Service Payment",
              subtitle: "Debited from ServiGo Wallet",
              amount,
              date: new Date().toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
              isCredit: false,
            },
          },
        },
      });

      return { success: true, balance: updated.balance };
    });
  }

  // Worker Wallet Methods
  async getWorkerWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    const worker: any = await this.prisma.worker.findFirst({
      where: {
        OR: [{ userId }, { user: { id: userId } }],
      },
    });

    let pendingClearance = 0;
    if (worker) {
      const pendingPayouts = await this.prisma.payoutTransaction.findMany({
        where: {
          workerId: worker.id,
          status: PayoutStatus.PENDING,
        },
      });
      pendingClearance = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);
    }

    return {
      availableBalance: wallet?.balance ?? 0.0,
      balance: wallet?.balance ?? 0.0,
      pendingClearance: Number(pendingClearance.toFixed(2)),
      bankAccount: {
        bankName: worker?.bankName || null,
        accountNumber: worker?.accountNumber || null,
        ifscCode: worker?.ifscCode || null,
        upiId: worker?.upiId || null,
      },
    };
  }

  async withdraw(userId: string, dto: WorkerWithdrawDto) {
    const worker: any = await this.prisma.worker.findFirst({
      where: {
        OR: [{ userId }, { user: { id: userId } }],
      },
    });

    if (!worker) {
      throw new NotFoundException("Worker profile not found");
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet || wallet.balance < dto.amount) {
        throw new BadRequestException(
          `Insufficient wallet balance. Available: ₹${wallet?.balance ?? 0}, Requested: ₹${dto.amount}`,
        );
      }

      // Deduct from wallet
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: { decrement: dto.amount },
          transactions: {
            create: {
              title: `Payout Withdrawal (${dto.payoutMethod})`,
              subtitle: `Transferred to ${dto.payoutMethod === "UPI" ? worker.upiId || "UPI" : worker.bankName || "Bank"}`,
              amount: dto.amount,
              date: new Date().toLocaleDateString("en-GB"),
              isCredit: false,
            },
          },
        },
      });

      // Create payout transaction
      const referenceId = `PO-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const payout = await tx.payoutTransaction.create({
        data: {
          workerId: worker.id,
          amount: dto.amount,
          payoutMethod: dto.payoutMethod,
          status: PayoutStatus.PENDING,
          referenceId,
          accountDetails: dto.accountDetails || {
            bankName: worker.bankName,
            accountNumber: worker.accountNumber,
            ifscCode: worker.ifscCode,
            upiId: worker.upiId,
          },
        },
      });

      return {
        success: true,
        message:
          "Payout request initiated successfully. Processing within 24 hours.",
        payout,
        remainingBalance: updatedWallet.balance,
      };
    });
  }

  async getWalletHistory(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const worker: any = await this.prisma.worker.findFirst({
      where: {
        OR: [{ userId }, { user: { id: userId } }],
      },
      include: {
        payoutTransactions: {
          orderBy: { createdAt: "desc" },
        },
      },
    } as any);

    return {
      availableBalance: wallet?.balance ?? 0.0,
      payouts: worker?.payoutTransactions ?? [],
      transactions: wallet?.transactions ?? [],
    };
  }
}
