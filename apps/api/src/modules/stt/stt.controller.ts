import { Controller, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ApiConsumes, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { SttService } from "./stt.service";

@ApiTags("stt")
@Controller("stt")
export class SttController {
  constructor(private readonly sttService: SttService) {}

  @Post("transcribe")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  async transcribe(@UploadedFile() file: { originalname: string; buffer: Buffer; mimetype?: string }) {
    return this.sttService.transcribe(file);
  }
}
