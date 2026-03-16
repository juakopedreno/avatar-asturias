import { Module } from "@nestjs/common";
import { SourcesModule } from "../sources/sources.module";
import { RagController } from "./rag.controller";
import { RagService } from "./rag.service";

@Module({
  imports: [SourcesModule],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
