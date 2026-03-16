import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ChatService } from "./chat.service";

@ApiTags("chat")
@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get("bootstrap")
  bootstrap() {
    return this.chatService.getBootstrap();
  }
}
