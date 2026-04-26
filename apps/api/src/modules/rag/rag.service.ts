import { Injectable } from "@nestjs/common";
import { load } from "cheerio";
import { PrismaService } from "../../prisma/prisma.service";
import { AlertsService } from "../alerts/alerts.service";
import { ContentService } from "../content/content.service";
import { SourcesService } from "../sources/sources.service";
import { AskQuestionDto } from "./dto/ask-question.dto";
import { IngestApiDto } from "./dto/ingest-api.dto";
import { IngestWebDto } from "./dto/ingest-web.dto";

const CONTROLLED_RESPONSE_MIN_SCORE = 3;

@Injectable()
export class RagService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sourcesService: SourcesService,
    private readonly contentService: ContentService,
    private readonly alertsService: AlertsService,
  ) {}

  async ingestPdf(sourceId: string, file: { originalname: string; buffer: Buffer }) {
    const source = await this.sourcesService.findById(sourceId);
    const job = await this.sourcesService.createIngestionJob({
      sourceId,
      sourceKind: "pdf",
      inputRef: file.originalname,
    });

    try {
      const text = await this.parsePdfText(file.buffer);
      const chunks = this.chunkText(text);
      const rows = await this.prisma.$transaction([
        this.prisma.sourceDocument.create({
          data: {
            sourceId,
            title: file.originalname,
            uri: file.originalname,
            rawText: text,
          },
        }),
        ...chunks.map((text) =>
          this.prisma.knowledgeChunk.create({
            data: {
              sourceId,
              sourceLabel: source.name,
              text,
              embedding: this.computePseudoEmbedding(text),
            },
          }),
        ),
      ]);
      await this.sourcesService.completeIngestionJob(job.id, chunks.length);
      await this.prisma.source.update({
        where: { id: sourceId },
        data: {
          documents: { increment: 1 },
          confidence: source.confidence < 90 ? 90 : source.confidence,
          status: "synced",
          lastSyncAt: new Date(),
        },
      });
      return {
        sourceId,
        ingested: chunks.length,
        jobId: job.id,
        documentId: rows[0].id,
      };
    } catch (error) {
      await this.sourcesService.failIngestionJob(
        job.id,
        error instanceof Error ? error.message : "pdf_ingestion_error",
      );
      throw error;
    }
  }

  private async parsePdfText(buffer: Buffer) {
    const parserModule = (await import("pdf-parse")) as {
      default?: unknown;
      PDFParse?: new (options: { data: Buffer }) => {
        getText: () => Promise<{ text?: string }>;
        destroy?: () => Promise<void>;
      };
    };

    const legacyParser = parserModule.default;
    if (typeof legacyParser === "function") {
      const parsed = await (legacyParser as (fileBuffer: Buffer) => Promise<{ text?: string }>)(buffer);
      if (typeof parsed?.text === "string" && parsed.text.trim().length > 0) {
        return parsed.text;
      }
    }

    if (typeof parserModule.PDFParse === "function") {
      const parser = new parserModule.PDFParse({ data: buffer });
      try {
        const parsed = await parser.getText();
        if (typeof parsed?.text === "string" && parsed.text.trim().length > 0) {
          return parsed.text;
        }
      } finally {
        await parser.destroy?.();
      }
    }

    return buffer.toString("utf-8");
  }

  async ingestWeb(dto: IngestWebDto) {
    const source = await this.sourcesService.findById(dto.sourceId);
    const job = await this.sourcesService.createIngestionJob({
      sourceId: dto.sourceId,
      sourceKind: "web",
      inputRef: dto.url,
    });
    try {
      const response = await fetch(dto.url);
      const html = await response.text();
      const $ = load(html);
      const text = $("body").text().replace(/\s+/g, " ").trim();
      const chunks = this.chunkText(text);

      await this.prisma.$transaction([
        this.prisma.sourceDocument.create({
          data: {
            sourceId: dto.sourceId,
            title: dto.url,
            uri: dto.url,
            rawText: text,
          },
        }),
        ...chunks.map((chunk) =>
          this.prisma.knowledgeChunk.create({
            data: {
              sourceId: dto.sourceId,
              sourceLabel: source.name,
              text: chunk,
              embedding: this.computePseudoEmbedding(chunk),
            },
          }),
        ),
      ]);

      await this.sourcesService.completeIngestionJob(job.id, chunks.length);
      await this.prisma.source.update({
        where: { id: dto.sourceId },
        data: {
          documents: { increment: 1 },
          confidence: source.confidence < 85 ? 85 : source.confidence,
          status: "synced",
          lastSyncAt: new Date(),
        },
      });
      return { sourceId: dto.sourceId, ingested: chunks.length, jobId: job.id };
    } catch (error) {
      await this.sourcesService.failIngestionJob(
        job.id,
        error instanceof Error ? error.message : "web_ingestion_error",
      );
      throw error;
    }
  }

  async ingestApi(dto: IngestApiDto) {
    const source = await this.sourcesService.findById(dto.sourceId);
    const job = await this.sourcesService.createIngestionJob({
      sourceId: dto.sourceId,
      sourceKind: "api",
      inputRef: dto.endpoint,
    });
    try {
      const response = await fetch(dto.endpoint);
      const payload = await response.json();
      const text = JSON.stringify(payload);
      const chunks = this.chunkText(text);

      await this.prisma.$transaction([
        this.prisma.sourceDocument.create({
          data: {
            sourceId: dto.sourceId,
            title: dto.endpoint,
            uri: dto.endpoint,
            rawText: text,
          },
        }),
        ...chunks.map((chunk) =>
          this.prisma.knowledgeChunk.create({
            data: {
              sourceId: dto.sourceId,
              sourceLabel: source.name,
              text: chunk,
              embedding: this.computePseudoEmbedding(chunk),
            },
          }),
        ),
      ]);

      await this.sourcesService.completeIngestionJob(job.id, chunks.length);
      await this.prisma.source.update({
        where: { id: dto.sourceId },
        data: {
          documents: { increment: 1 },
          confidence: source.confidence < 80 ? 80 : source.confidence,
          status: "synced",
          lastSyncAt: new Date(),
        },
      });
      return { sourceId: dto.sourceId, ingested: chunks.length, jobId: job.id };
    } catch (error) {
      await this.sourcesService.failIngestionJob(
        job.id,
        error instanceof Error ? error.message : "api_ingestion_error",
      );
      throw error;
    }
  }

  async ask(dto: AskQuestionDto) {
    const normalized = this.normalizeForSearch(dto.question);
    if (this.isGreeting(normalized)) {
      let greetingAnswer = this.appendWearablesToText(
        this.getGreetingForLanguage(dto.language),
        dto.wearablesSummary,
      );
      const activeAlerts = await this.alertsService.findActive();
      const greetingAlerts = activeAlerts.filter((a) => a.showOnGreeting);
      if (greetingAlerts.length > 0) {
        const alertText = greetingAlerts.map((a) => `[Aviso] ${a.title}: ${a.message}`).join(" ");
        greetingAnswer = `${greetingAnswer} ${alertText}`.trim();
      }
      const conversation = await this.prisma.conversation.create({
        data: {
          language: dto.language,
          messages: {
            create: [
              {
                role: "user",
                content: dto.question,
              },
              {
                role: "assistant",
                content: greetingAnswer,
              },
            ],
          },
        },
      });
      return {
        answer: greetingAnswer,
        uncertainty: false,
        sources: [],
        guardrails: {
          offTopicBlocked: false,
          personalDataUsedForTraining: false,
        },
        conversationId: conversation.id,
      };
    }

    const tokens = this.tokenizeForSearch(normalized);
    const published = await this.contentService.findAllPublished();
    const controlledScores = published.map((cr) => {
      const score = this.scoreControlledResponse(normalized, tokens, cr.question, cr.questionVariants ?? []);
      return { controlled: cr, score };
    });
    const bestControlled = controlledScores
      .filter((x) => x.score >= CONTROLLED_RESPONSE_MIN_SCORE)
      .sort((a, b) => b.score - a.score)[0];

    if (bestControlled) {
      let answer = bestControlled.controlled.answer;
      const topicAlerts = await this.getAlertsMatchingQuestion(normalized);
      if (topicAlerts.length > 0) {
        const prefix = topicAlerts.map((a) => `[Aviso] ${a.title}: ${a.message}`).join(" ");
        answer = `${prefix} ${answer}`.trim();
      }
      const conversation = await this.prisma.conversation.create({
        data: { language: dto.language },
      });
      await this.prisma.message.create({
        data: { conversationId: conversation.id, role: "user", content: dto.question },
      });
      const assistantMessage = await this.prisma.message.create({
        data: { conversationId: conversation.id, role: "assistant", content: answer },
      });
      await this.prisma.citation.create({
        data: {
          messageId: assistantMessage.id,
          sourceId: bestControlled.controlled.id,
          sourceLabel: "Respuesta controlada",
          updatedAt: bestControlled.controlled.updatedAt,
        },
      });
      return {
        answer,
        uncertainty: false,
        sources: [
          {
            id: bestControlled.controlled.id,
            label: "Respuesta controlada",
            sourceLabel: "Respuesta controlada",
            updatedAt: bestControlled.controlled.updatedAt,
          },
        ],
        guardrails: { offTopicBlocked: false, personalDataUsedForTraining: false },
        conversationId: conversation.id,
      };
    }

    const candidates = await this.prisma.knowledgeChunk.findMany({
      orderBy: { updatedAt: "desc" },
      take: 800,
    });
    const scored = candidates
      .map((chunk) => {
        const chunkNormalized = this.normalizeForSearch(chunk.text);
        let score = 0;
        for (const token of tokens) {
          if (chunkNormalized.includes(token)) {
            score += 1;
          }
        }
        if (chunkNormalized.includes(normalized)) {
          score += 4;
        }
        return { chunk, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    const matched = scored.slice(0, 6).map((item) => item.chunk);

    if (matched.length === 0) {
      let noSourceAnswer =
        "No dispongo de una fuente fiable para esa consulta en este momento. Te recomiendo revisar los canales oficiales del Ayuntamiento.";
      const topicAlerts = await this.getAlertsMatchingQuestion(normalized);
      if (topicAlerts.length > 0) {
        const prefix = topicAlerts.map((a) => `[Aviso] ${a.title}: ${a.message}`).join(" ");
        noSourceAnswer = `${prefix} ${noSourceAnswer}`.trim();
      }
      const conversation = await this.prisma.conversation.create({
        data: {
          language: dto.language,
          messages: {
            create: [
              {
                role: "user",
                content: dto.question,
              },
              {
                role: "assistant",
                content: noSourceAnswer,
              },
            ],
          },
        },
      });
      return {
        answer: noSourceAnswer,
        uncertainty: true,
        sources: [],
        conversationId: conversation.id,
      };
    }

    const selectedForCitations = matched.slice(0, 3);
    const generated = await this.generateContextualAnswer(dto, matched);
    let finalAnswer = generated.answer;
    const topicAlerts = await this.getAlertsMatchingQuestion(normalized);
    if (topicAlerts.length > 0) {
      const prefix = topicAlerts.map((a) => `[Aviso] ${a.title}: ${a.message}`).join(" ");
      finalAnswer = `${prefix} ${finalAnswer}`.trim();
    }
    const conversation = await this.prisma.conversation.create({
      data: {
        language: dto.language,
      },
    });
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: dto.question,
      },
    });
    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: finalAnswer,
      },
    });
    await Promise.all(
      selectedForCitations.map((chunk) =>
        this.prisma.citation.create({
          data: {
            messageId: assistantMessage.id,
            sourceId: chunk.sourceId,
            sourceLabel: chunk.sourceLabel,
            updatedAt: chunk.updatedAt,
          },
        }),
      ),
    );
    return {
      answer: finalAnswer,
      uncertainty: generated.uncertainty,
      sources: selectedForCitations.map((chunk) => ({
        id: chunk.sourceId,
        label: chunk.sourceLabel,
        sourceLabel: chunk.sourceLabel,
        updatedAt: chunk.updatedAt,
      })),
      guardrails: {
        offTopicBlocked: generated.offTopicBlocked,
        personalDataUsedForTraining: false,
      },
      conversationId: conversation.id,
    };
  }

  private async getAlertsMatchingQuestion(
    normalizedQuestion: string,
  ): Promise<Array<{ title: string; message: string }>> {
    const active = await this.alertsService.findActive();
    const matching: Array<{ title: string; message: string }> = [];
    for (const alert of active) {
      const keywords = alert.keywords ?? [];
      for (const kw of keywords) {
        const kwNorm = this.normalizeForSearch(kw);
        if (kwNorm && normalizedQuestion.includes(kwNorm)) {
          matching.push({ title: alert.title, message: alert.message });
          break;
        }
      }
    }
    return matching;
  }

  listChunks() {
    return this.prisma.knowledgeChunk.findMany({
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
  }

  private chunkText(raw: string, chunkSize = 900) {
    const cleaned = raw.replace(/\s+/g, " ").trim();
    if (!cleaned) {
      return [];
    }
    const chunks: string[] = [];
    for (let i = 0; i < cleaned.length; i += chunkSize) {
      chunks.push(cleaned.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private computePseudoEmbedding(text: string) {
    const base = Math.min(1, text.length / 1000);
    return [base, base / 2, base / 3];
  }

  private async generateContextualAnswer(
    dto: AskQuestionDto,
    matched: Array<{ sourceId: string; sourceLabel: string; text: string; updatedAt: Date }>,
  ): Promise<{ answer: string; uncertainty: boolean; offTopicBlocked: boolean }> {
    const context = matched
      .map((chunk, index) => {
        const snippet = chunk.text.slice(0, 700).replace(/\s+/g, " ").trim();
        return `[${index + 1}] ${chunk.sourceLabel}\n${snippet}`;
      })
      .join("\n\n");

    const localFallback = this.buildLocalAnswer(dto.question, matched);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        answer: localFallback,
        uncertainty: false,
        offTopicBlocked: false,
      };
    }

    try {
      const languageName = this.resolveLanguageName(dto.language);
      const wearablesBlock = dto.wearablesSummary?.trim()
        ? `\nDatos de pulsera/biometría (orientativos, no sustituyen valoración médica):\n${dto.wearablesSummary.trim()}\n`
        : "";
      const wearableSystemHint = dto.wearablesSummary?.trim()
        ? " Si hay datos de pulsera, enlázalos de forma explícita con 1–3 recomendaciones concretas de bienestar (sin alarmismo ni diagnósticos)."
        : "";
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.RAG_OPENAI_MODEL ?? "gpt-4o-mini",
          temperature: 0.2,
          max_tokens: 350,
          messages: [
            {
              role: "system",
              content:
                `Eres el asistente de salud y bienestar de SHA Wellness Clinic. ` +
                `Responde en ${languageName} con tono claro, empático y breve. ` +
                "Habla de hábitos, descanso, actividad, nutrición general y protocolos de bienestar según el contexto. " +
                "No inventes diagnósticos ni recomiendes medicación; ante síntomas graves deriva a profesional. " +
                "Usa solo el contexto proporcionado y no inventes datos. " +
                "Si el contexto no alcanza, dilo y pide una aclaración. " +
                "No ofrezcas guías de turismo, playas, transporte ni actividades de ocio de ciudad." +
                wearableSystemHint,
            },
            {
              role: "user",
              content:
                `Pregunta del usuario:\n${dto.question}\n` +
                wearablesBlock +
                `\nContexto recuperado:\n${context}\n\n` +
                "Redacta una respuesta útil para el usuario final.",
            },
          ],
        }),
      });

      if (!response.ok) {
        return {
          answer: localFallback,
          uncertainty: false,
          offTopicBlocked: false,
        };
      }

      const json = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };
      const answer = json.choices?.[0]?.message?.content?.trim();
      if (!answer) {
        return {
          answer: localFallback,
          uncertainty: false,
          offTopicBlocked: false,
        };
      }

      return {
        answer,
        uncertainty: false,
        offTopicBlocked: false,
      };
    } catch {
      return {
        answer: localFallback,
        uncertainty: false,
        offTopicBlocked: false,
      };
    }
  }

  private buildLocalAnswer(
    question: string,
    matched: Array<{ sourceLabel: string; text: string }>,
  ): string {
    const summary = matched
      .slice(0, 2)
      .map((chunk) => chunk.text.replace(/\s+/g, " ").trim())
      .join(" ");
    if (!summary) {
      return "No dispongo de contexto suficiente para responder con fiabilidad en este momento.";
    }
    const excerpt = summary.slice(0, 480);
    return (
      `Segun las fuentes disponibles, para tu consulta "${question}" ` +
      `la informacion relevante es: ${excerpt}${summary.length > 480 ? "..." : ""}`
    );
  }

  private appendWearablesToText(base: string, wearables?: string): string {
    const w = wearables?.trim();
    if (!w) {
      return base;
    }
    return `${base} (Contexto pulsera, orientativo: ${w})`.trim();
  }

  private getGreetingForLanguage(language: AskQuestionDto["language"]): string {
    const greetings: Record<AskQuestionDto["language"], string> = {
      ES:
        "Hola, soy tu asistente de bienestar de SHA. Puedo orientarte sobre descanso, actividad, manejo del estrés y cuidado integral con la información y protocolos disponibles. Cuéntame cómo te sientes o qué necesitas.",
      EN:
        "Hello, I'm your SHA wellness assistant. I can help with sleep, activity, stress management, and holistic care using the information and protocols we have. How are you feeling, or what do you need today?",
      DE:
        "Hallo, ich bin Ihr SHA-Wellness-Assistent. Ich kann zu Schlaf, Bewegung, Stressmanagement und ganzheitlicher Vorsorge anhand unserer Informationen und Protokolle beraten. Wie fühlen Sie sich, oder womit kann ich Ihnen helfen?",
      FR:
        "Bonjour, je suis votre assistant bien-être SHA. Je peux vous accompagner sur le sommeil, l'activité, le stress et les soins globaux d'après nos informations et protocoles. Comment vous sentez-vous, ou de quoi avez-vous besoin ?",
    };
    return greetings[language] ?? greetings.ES;
  }

  private resolveLanguageName(language: AskQuestionDto["language"]): string {
    if (language === "EN") return "ingles";
    if (language === "FR") return "frances";
    if (language === "DE") return "aleman";
    return "espanol";
  }

  private scoreControlledResponse(
    normalizedUser: string,
    userTokens: string[],
    question: string,
    questionVariants: string[],
  ): number {
    const toScore = [question, ...questionVariants];
    let best = 0;
    for (const q of toScore) {
      const qNorm = this.normalizeForSearch(q);
      let score = 0;
      for (const token of userTokens) {
        if (qNorm.includes(token)) score += 1;
      }
      if (qNorm.includes(normalizedUser) || normalizedUser.includes(qNorm)) score += 4;
      if (score > best) best = score;
    }
    return best;
  }

  private normalizeForSearch(input: string): string {
    return input
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private tokenizeForSearch(normalizedQuestion: string): string[] {
    const stopwords = new Set([
      "que",
      "es",
      "el",
      "la",
      "los",
      "las",
      "de",
      "del",
      "y",
      "en",
      "por",
      "para",
      "un",
      "una",
      "al",
      "como",
      "donde",
      "cuando",
      "cual",
    ]);
    const unique = new Set<string>();
    for (const token of normalizedQuestion.split(" ")) {
      const trimmed = token.trim();
      if (trimmed.length < 3 || stopwords.has(trimmed)) continue;
      unique.add(trimmed);
    }
    return Array.from(unique);
  }

  private isGreeting(normalizedQuestion: string): boolean {
    const compact = normalizedQuestion
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim();
    const greetings = new Set([
      "hola",
      "buenas",
      "buenos dias",
      "buenas tardes",
      "buenas noches",
      "hey",
      "hello",
      "hi",
    ]);
    return greetings.has(compact);
  }
}
