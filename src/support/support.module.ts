import { Module } from "@nestjs/common";
import { SupportController } from "./support.controller";
import { SupportService } from "./support.service";
import { PrismaModule } from "../prisma/prisma.module";
import { GatewayModule } from "../gateway/gateway.module";

@Module({
  imports: [PrismaModule, GatewayModule],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
