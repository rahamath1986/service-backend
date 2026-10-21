import { Module } from "@nestjs/common";
import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";
import { PrismaModule } from "../prisma/prisma.module";
import { GatewayModule } from "../gateway/gateway.module";

@Module({
  imports: [PrismaModule, GatewayModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
