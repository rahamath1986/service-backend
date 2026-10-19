import { Module } from "@nestjs/common";
import { WorkerProfileController } from "./worker-profile.controller";
import { WorkerProfileService } from "./worker-profile.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [WorkerProfileController],
  providers: [WorkerProfileService],
  exports: [WorkerProfileService],
})
export class WorkerProfileModule {}
