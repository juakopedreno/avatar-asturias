import { Module } from "@nestjs/common";
import { ContentModule } from "../content/content.module";
import { SourcesModule } from "../sources/sources.module";
import { RagController } from "./rag.controller";
import { RagService } from "./rag.service";

@Module({
  imports: [SourcesModule, ContentModule],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
