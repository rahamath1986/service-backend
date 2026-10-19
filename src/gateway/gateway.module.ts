import { Module, Global } from "@nestjs/common";
import { AppGateway } from "./app.gateway";
import { PrismaModule } from "../prisma/prisma.module";

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AppGateway],
  exports: [AppGateway],
})
export class GatewayModule {}
