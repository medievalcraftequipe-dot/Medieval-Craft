import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { InviteLinksController } from "./invite-links.controller";
import { ServersController } from "./servers.controller";
import { ServersService } from "./servers.service";

@Module({
  imports: [AuthModule],
  controllers: [InviteLinksController, ServersController],
  providers: [ServersService]
})
export class ServersModule {}
