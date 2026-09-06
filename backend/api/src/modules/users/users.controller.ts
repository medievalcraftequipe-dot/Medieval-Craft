import { Controller, Get, Param } from "@nestjs/common";
import { UsersService } from "./users.service";
import { presentAuthUser } from "./user.presenter";

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("username/:username")
  async getByUsername(@Param("username") username: string) {
    const user = await this.users.getPublicProfile(username);
    return presentAuthUser(user);
  }
}
