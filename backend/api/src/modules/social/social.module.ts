import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DirectController } from "./direct.controller";
import { FriendsController } from "./friends.controller";
import { SocialService } from "./social.service";

@Module({
  imports: [AuthModule],
  controllers: [DirectController, FriendsController],
  providers: [SocialService]
})
export class SocialModule {}
