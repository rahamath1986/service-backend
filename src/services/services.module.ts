import { Module } from "@nestjs/common";
import { ServicesController } from "./services.controller";
import { CategoriesController } from "./categories.controller";
import { ServicesService } from "./services.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [ServicesController, CategoriesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
