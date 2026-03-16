import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { Roles } from "../../common/auth/roles.decorator";
import { RolesGuard } from "../../common/auth/roles.guard";
import { AskQuestionDto } from "./dto/ask-question.dto";
import { IngestApiDto } from "./dto/ingest-api.dto";
import { IngestWebDto } from "./dto/ingest-web.dto";
import { RagService } from "./rag.service";

@ApiTags("rag")
@Controller("rag")
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Get("chunks")
  async chunks() {
    return this.ragService.listChunks();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "editor")
  @UseInterceptors(FileInterceptor("file"))
  @Post("ingest/pdf")
  async ingestPdf(
    @Body() body: { sourceId: string },
    @UploadedFile() file: { originalname: string; buffer: Buffer },
  ) {
    return this.ragService.ingestPdf(body.sourceId, file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "editor")
  @Post("ingest/web")
  async ingestWeb(@Body() dto: IngestWebDto) {
    return this.ragService.ingestWeb(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "editor")
  @Post("ingest/api")
  async ingestApi(@Body() dto: IngestApiDto) {
    return this.ragService.ingestApi(dto);
  }

  @Post("ask")
  async ask(@Body() dto: AskQuestionDto) {
    return this.ragService.ask(dto);
  }
}
