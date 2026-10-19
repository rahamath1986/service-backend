import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { ServicesModule } from "./services/services.module";
import { WorkersModule } from "./workers/workers.module";
import { BookingsModule } from "./bookings/bookings.module";
import { WalletModule } from "./wallet/wallet.module";
import { ChatModule } from "./chat/chat.module";
import { WorkerProfileModule } from "./worker-profile/worker-profile.module";
import { JobsModule } from "./jobs/jobs.module";
import { EarningsModule } from "./earnings/earnings.module";
import { GatewayModule } from "./gateway/gateway.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { SupportModule } from "./support/support.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    GatewayModule,
    AuthModule,
    ServicesModule,
    WorkersModule,
    BookingsModule,
    JobsModule,
    WorkerProfileModule,
    EarningsModule,
    WalletModule,
    ChatModule,
    NotificationsModule,
    SupportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
