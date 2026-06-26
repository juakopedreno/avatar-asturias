import { Injectable } from "@nestjs/common";
import { load } from "cheerio";
import { PrismaService } from "../../prisma/prisma.service";
import { AlertsService } from "../alerts/alerts.service";
import { ContentService } from "../content/content.service";
import { SourcesService } from "../sources/sources.service";
import { COVA_OPENING_GREETING, COVA_IDENTITY_ANSWER, COVA_IDENTITY_ANSWER_EN, COVA_SMALL_TALK_ANSWER, COVA_SMALL_TALK_ANSWER_EN, COVA_THANKS_ANSWER, COVA_THANKS_ANSWER_EN, COVA_FAREWELL_ANSWER, COVA_FAREWELL_ANSWER_EN } from "../persona/asturias-cova.prompt";
import { AskQuestionDto } from "./dto/ask-question.dto";
import { IngestApiDto } from "./dto/ingest-api.dto";
import { IngestWebDto } from "./dto/ingest-web.dto";

const CONTROLLED_RESPONSE_MIN_SCORE = 3;

type CasualIntent = "greeting" | "wellbeing" | "thanks" | "farewell" | "open";

const INSTITUTIONAL_TOPIC_KEYWORDS = [
  "ayuda",
  "ayudas",
  "tramite",
  "tramites",
  "subvencion",
  "subvenciones",
  "beca",
  "becas",
  "servicio",
  "servicios",
  "solicitud",
  "solicitar",
  "documento",
  "documentacion",
  "dependencia",
  "mayores",
  "normativa",
  "plazo",
  "cita",
  "registro",
  "principado",
  "asturias",
  "empadron",
  "certificado",
  "impuesto",
  "tasas",
];

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
    if (this.isCasualConversation(normalized)) {
      const intent = this.classifyCasualIntent(normalized);
      const casualAnswer =
        intent === "open"
          ? await this.generateCasualConversationAnswer(
              dto,
              this.getCasualFallbackForLanguage(dto.language, normalized),
            )
          : this.getCasualAnswerForIntent(intent, dto.language);
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
                content: casualAnswer,
              },
            ],
          },
        },
      });
      return {
        answer: casualAnswer,
        uncertainty: false,
        sources: [],
        guardrails: {
          offTopicBlocked: false,
          personalDataUsedForTraining: false,
        },
        conversationId: conversation.id,
      };
    }

    if (this.isAssistantIdentityQuestion(normalized)) {
      const identityAnswer = this.getIdentityAnswerForLanguage(dto.language);
      const conversation = await this.prisma.conversation.create({
        data: {
          language: dto.language,
          messages: {
            create: [
              { role: "user", content: dto.question },
              { role: "assistant", content: identityAnswer },
            ],
          },
        },
      });
      return {
        answer: identityAnswer,
        uncertainty: false,
        sources: [],
        guardrails: {
          offTopicBlocked: false,
          personalDataUsedForTraining: false,
        },
        conversationId: conversation.id,
      };
    }

    if (dto.wearablesSummary?.trim() && this.isExplicitWearablesRequest(normalized)) {
      let wearablesAnswer = this.buildWearablesGuidanceAnswer(
        dto.language,
        dto.question,
        dto.wearablesSummary,
      );
      const topicAlerts = await this.getAlertsMatchingQuestion(normalized);
      if (topicAlerts.length > 0) {
        const prefix = topicAlerts.map((a) => `[Aviso] ${a.title}: ${a.message}`).join(" ");
        wearablesAnswer = `${prefix} ${wearablesAnswer}`.trim();
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
                content: wearablesAnswer,
              },
            ],
          },
        },
      });
      return {
        answer: wearablesAnswer,
        uncertainty: false,
        sources: [
          {
            id: "wearables-fitbit-summary",
            label: "Resumen Fitbit",
            sourceLabel: "Resumen Fitbit",
            updatedAt: new Date(),
          },
        ],
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
        "No dispongo de una fuente fiable para esa consulta en este momento. Te recomiendo revisar los canales oficiales del Principado de Asturias o reformular la pregunta.";
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
      const normalizedQ = this.normalizeForSearch(dto.question);
      const attachWearables =
        Boolean(dto.wearablesSummary?.trim()) && this.isExplicitWearablesRequest(normalizedQ);
      const wearablesBlock = attachWearables
        ? `\nDatos de pulsera/biometría (orientativos, no sustituyen valoración médica):\n${dto.wearablesSummary!.trim()}\n`
        : "";
      const wearableSystemHint = attachWearables
        ? " Si hay datos de pulsera, enlázalos de forma explícita con 1–3 recomendaciones concretas de bienestar (sin alarmismo ni diagnósticos)."
        : "";
      const noWearablesDetailHint =
        dto.wearablesSummary?.trim() && !attachWearables
          ? " No incluyas cifras ni análisis detallados de pulsera o biometría: el usuario no ha pedido datos del dispositivo en esta conversación. Responde de forma breve y natural."
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
                `Eres el asistente virtual del Principado de Asturias. ` +
                `Responde en ${languageName} con tono claro, cercano e institucional. ` +
                "Usa solo el contexto recuperado de fuentes oficiales; no inventes normativa, plazos, importes ni trámites. " +
                "Si el contexto no alcanza, dilo con naturalidad y sugiere consultar la web o los canales oficiales del Principado. " +
                "No des asesoramiento legal vinculante ni sustituyas la atención presencial cuando el trámite lo requiera." +
                wearableSystemHint +
                noWearablesDetailHint,
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

  /** Saludo ligero: guiño opcional sin volcar métricas del wearable. */
  private appendWearablesConversationHint(
    base: string,
    wearablesSummary: string | undefined,
    language: AskQuestionDto["language"],
  ): string {
    if (!wearablesSummary?.trim()) {
      return base;
    }
    const hints: Record<AskQuestionDto["language"], string> = {
      ES: "Cuando quieras, puedo usar lo que marca tu pulsera si preguntas por algo concreto (pasos, pulso o sueño).",
      EN: "Whenever you’re ready, I can look at what your bracelet shows if you ask for something specific — steps, heart rate or sleep.",
      DE: "Wenn du möchtest, kann ich die Werte vom Armband nutzen, wenn du konkret nach Schritten, Puls oder Schlaf fragst.",
      FR: "Si tu veux, je peux utiliser ce que montre ton bracelet si tu poses une question précise — pas, pouls ou sommeil.",
    };
    return `${base} ${hints[language] ?? hints.ES}`.trim();
  }

  private getGreetingForLanguage(language: AskQuestionDto["language"]): string {
    if (language === "ES") {
      return COVA_OPENING_GREETING;
    }
    const greetings: Record<Exclude<AskQuestionDto["language"], "ES">, string> = {
      EN:
        "Hello, I'm CoVA, the Principality of Asturias virtual assistant. How can I help you today with official information on grants, procedures and services?",
      DE:
        "Hallo, ich bin CoVA, der virtuelle Assistent des Fürstentums Asturien. Womit kann ich Ihnen heute helfen?",
      FR:
        "Bonjour, je suis CoVA, l'assistant virtuel de la Principauté des Asturies. Comment puis-je vous aider aujourd'hui ?",
    };
    return greetings[language] ?? COVA_OPENING_GREETING;
  }

  private classifyCasualIntent(normalizedQuestion: string): CasualIntent {
    if (this.isThanks(normalizedQuestion)) return "thanks";
    if (this.isFarewell(normalizedQuestion)) return "farewell";
    if (this.isGreeting(normalizedQuestion)) return "greeting";
    if (this.isSmallTalk(normalizedQuestion)) return "wellbeing";
    return "open";
  }

  private getCasualAnswerForIntent(intent: Exclude<CasualIntent, "open">, language: AskQuestionDto["language"]): string {
    switch (intent) {
      case "greeting":
        return this.getGreetingForLanguage(language);
      case "wellbeing":
        return this.getSmallTalkAnswerForLanguage(language);
      case "thanks":
        return this.getThanksAnswerForLanguage(language);
      case "farewell":
        return this.getFarewellAnswerForLanguage(language);
    }
  }

  private getCasualFallbackForLanguage(language: AskQuestionDto["language"], normalizedQuestion: string): string {
    const intent = this.classifyCasualIntent(normalizedQuestion);
    if (intent !== "open") {
      return this.getCasualAnswerForIntent(intent, language);
    }
    return this.getSmallTalkAnswerForLanguage(language);
  }

  private async generateCasualConversationAnswer(dto: AskQuestionDto, fallback: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return fallback;

    try {
      const languageName = this.resolveLanguageName(dto.language);
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.RAG_OPENAI_MODEL ?? "gpt-4o-mini",
          temperature: 0.45,
          max_tokens: 120,
          messages: [
            {
              role: "system",
              content:
                `Eres CoVA, asistente virtual del Principado de Asturias. ` +
                `Responde en ${languageName} con tono cercano, natural, breve e institucional. ` +
                "Esta es conversación casual, no una consulta documental: no digas que faltan fuentes. " +
                "Responde DIRECTAMENTE a lo que el usuario acaba de decir o preguntar. " +
                'Si pregunta "cómo estás" o similar, contesta primero a eso (por ejemplo, que estás bien). ' +
                "No ignores su mensaje ni respondas solo con un saludo genérico distinto a lo preguntado. " +
                "No inventes trámites, normativa, plazos, importes ni datos administrativos. " +
                "Máximo 2 frases cortas. Cierra invitando a ayudar con ayudas, trámites o servicios del Principado si encaja.",
            },
            {
              role: "user",
              content: dto.question,
            },
          ],
        }),
      });

      if (!response.ok) return fallback;
      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const answer = json.choices?.[0]?.message?.content?.trim();
      return answer || fallback;
    } catch {
      return fallback;
    }
  }

  private getFarewellAnswerForLanguage(language: AskQuestionDto["language"]): string {
    if (language === "EN") return COVA_FAREWELL_ANSWER_EN;
    const answers: Record<Exclude<AskQuestionDto["language"], "EN">, string> = {
      ES: COVA_FAREWELL_ANSWER,
      DE:
        "Auf Wiedersehen! Wenn Sie Hilfe zu Zuschüssen, Verfahren oder Dienstleistungen des Fürstentums Asturien brauchen, bin ich da.",
      FR:
        "Au revoir ! Si vous avez besoin d'aide sur les aides, démarches ou services de la Principauté des Asturies, je suis là.",
    };
    return answers[language] ?? COVA_FAREWELL_ANSWER;
  }

  private getSmallTalkAnswerForLanguage(language: AskQuestionDto["language"]): string {
    if (language === "EN") return COVA_SMALL_TALK_ANSWER_EN;
    const answers: Record<Exclude<AskQuestionDto["language"], "EN">, string> = {
      ES: COVA_SMALL_TALK_ANSWER,
      DE:
        "Mir geht es gut, danke der Nachfrage! Ich bin CoVA, der virtuelle Assistent des Fürstentums Asturien. Kann ich Ihnen bei Zuschüssen, Verfahren oder Dienstleistungen helfen?",
      FR:
        "Très bien, merci de demander ! Je suis CoVA, l'assistant virtuel de la Principauté des Asturies. Puis-je vous aider avec des aides, démarches ou services ?",
    };
    return answers[language] ?? COVA_SMALL_TALK_ANSWER;
  }

  private getThanksAnswerForLanguage(language: AskQuestionDto["language"]): string {
    if (language === "EN") return COVA_THANKS_ANSWER_EN;
    const answers: Record<Exclude<AskQuestionDto["language"], "EN">, string> = {
      ES: COVA_THANKS_ANSWER,
      DE:
        "Gern geschehen! Wenn Sie noch etwas zu Zuschüssen, Verfahren oder Dienstleistungen des Fürstentums Asturien brauchen, bin ich da.",
      FR:
        "Je vous en prie ! Si vous avez besoin d'autre chose sur les aides, démarches ou services de la Principauté des Asturies, je suis là.",
    };
    return answers[language] ?? COVA_THANKS_ANSWER;
  }

  private getIdentityAnswerForLanguage(language: AskQuestionDto["language"]): string {
    if (language === "EN") return COVA_IDENTITY_ANSWER_EN;
    return COVA_IDENTITY_ANSWER;
  }

  private isAssistantIdentityQuestion(normalizedQuestion: string): boolean {
    const q = normalizedQuestion.trim();
    if (!q) return false;

    const identityPhrases = [
      "que es cova",
      "quien es cova",
      "que eres",
      "quien eres",
      "que eres tu",
      "quien eres tu",
      "que es co va",
      "presentate",
      "presentacion",
      "cuentame sobre cova",
      "hablame de cova",
      "que puedes hacer",
      "para que sirves",
      "que haces",
      "que es el asistente",
      "que es la asistente",
      "que es este asistente",
      "what is cova",
      "who is cova",
      "who are you",
      "what are you",
    ];

    if (identityPhrases.some((phrase) => q.includes(phrase))) {
      return true;
    }

    const mentionsCova = q.includes("cova") || q.includes("co va");
    const asksDefinition =
      q.includes("que es") || q.includes("quien es") || q.includes("que eres") || q.includes("quien eres");
    return mentionsCova && asksDefinition;
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
      "saludos",
      "buen dia",
    ]);
    return greetings.has(compact);
  }

  private isCasualConversation(normalizedQuestion: string): boolean {
    return (
      this.isGreeting(normalizedQuestion) ||
      this.isSmallTalk(normalizedQuestion) ||
      this.isThanks(normalizedQuestion) ||
      this.isFarewell(normalizedQuestion) ||
      this.isOpenCasualConversation(normalizedQuestion)
    );
  }

  private isOpenCasualConversation(normalizedQuestion: string): boolean {
    const q = normalizedQuestion.trim();
    if (!q || q.length > 80) return false;
    if (INSTITUTIONAL_TOPIC_KEYWORDS.some((keyword) => q.includes(keyword))) return false;
    if (/\b(como|donde|cuando|cual)\b/.test(q) && /\b(solicit|pedir|tramit|empadron|certific|inscrib)/.test(q)) {
      return false;
    }
    const words = q.split(/\s+/).filter(Boolean);
    return words.length <= 10;
  }

  private matchesConversationalPhrase(normalizedQuestion: string, phrases: string[]): boolean {
    const q = normalizedQuestion.trim();
    if (!q) return false;
    if (phrases.includes(q)) return true;

    const parts = q
      .split(/[,!.?]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.some((part) => phrases.includes(part));
  }

  private isSmallTalk(normalizedQuestion: string): boolean {
    const phrases = [
      "como estas",
      "como te va",
      "como te encuentras",
      "como va",
      "como van las cosas",
      "que tal",
      "que tal estas",
      "que tal va",
      "todo bien",
      "como andas",
      "como andamos",
      "hola como estas",
      "buenos dias como estas",
      "how are you",
      "how is it going",
      "how are things",
      "ca va",
      "comment allez vous",
      "wie geht es",
      "wie gehts",
    ];

    return this.matchesConversationalPhrase(normalizedQuestion, phrases);
  }

  private isFarewell(normalizedQuestion: string): boolean {
    const phrases = [
      "adios",
      "hasta luego",
      "hasta pronto",
      "nos vemos",
      "chao",
      "bye",
      "goodbye",
      "see you",
      "au revoir",
      "tschuss",
    ];

    return this.matchesConversationalPhrase(normalizedQuestion, phrases);
  }

  private isThanks(normalizedQuestion: string): boolean {
    const phrases = [
      "gracias",
      "muchas gracias",
      "mil gracias",
      "te lo agradezco",
      "muy amable",
      "thank you",
      "thanks",
      "merci",
      "danke",
    ];

    return this.matchesConversationalPhrase(normalizedQuestion, phrases);
  }

  /**
   * Solo preguntas explícitas por métricas o por el wearable.
   * Evita activar con charla general vaga (actividad, descanso, corazón en sentido figurado…).
   * Comprueba tokens para no confundir p. ej. "impulso" con "pulso".
   */
  private isExplicitWearablesRequest(normalizedQuestion: string): boolean {
    const tokens = new Set(normalizedQuestion.split(/\s+/).filter((t) => t.length >= 2));
    const tokenHits = [
      "pasos",
      "pulso",
      "pulsaciones",
      "pulsera",
      "ppm",
      "bpm",
      "lpm",
      "sueno",
      "dormi",
      "dormiste",
      "fitbit",
      "sedentario",
      "steps",
      "sleep",
      "slept",
      "heart",
      "wearable",
      "wearables",
      "calorias",
      "calorie",
      "calories",
      "resting",
      "biometria",
      "biometrico",
    ];
    if (tokenHits.some((t) => tokens.has(t))) {
      return true;
    }
    const phrases = [
      "ritmo cardiaco",
      "frecuencia cardiaca",
      "heart rate",
      "datos de la pulsera",
      "datos del wearable",
      "datos biometricos",
      "minutos activos",
      "active zone",
    ];
    return phrases.some((p) => normalizedQuestion.includes(p));
  }

  private buildWearablesGuidanceAnswer(
    language: AskQuestionDto["language"],
    question: string,
    wearablesSummary: string,
  ): string {
    if (language === "EN") {
      return (
        `Based on your wearable data, this is the current snapshot: ${wearablesSummary}. ` +
        `For your question (“${question}”), I suggest: 1) keep hydration and light movement today, ` +
        `2) if sleep was limited, prioritize an earlier bedtime and reduce late caffeine/screens, ` +
        `3) if symptoms worsen or persist, seek professional assessment. ` +
        "This guidance is wellness-oriented and does not replace medical diagnosis."
      );
    }
    if (language === "FR") {
      return (
        `D'après vos données de bracelet, l'état actuel est: ${wearablesSummary}. ` +
        `Pour votre question («${question}»), je recommande: 1) hydratation et mouvement léger aujourd'hui, ` +
        "2) si le sommeil a été limité, coucher plus tôt et moins de caféine/écrans le soir, " +
        "3) si les symptômes persistent ou s'aggravent, consultez un professionnel. " +
        "Ces recommandations de bien-être ne remplacent pas un diagnostic médical."
      );
    }
    if (language === "DE") {
      return (
        `Laut Ihren Wearable-Daten ist der aktuelle Stand: ${wearablesSummary}. ` +
        `Zu Ihrer Frage („${question}“) empfehle ich: 1) heute gut hydrieren und leichte Bewegung, ` +
        "2) bei wenig Schlaf früher schlafen gehen und abends Koffein/Bildschirmzeit reduzieren, " +
        "3) bei anhaltenden oder stärkeren Beschwerden medizinisch abklären lassen. " +
        "Diese Hinweise sind wellness-orientiert und ersetzen keine Diagnose."
      );
    }
    return (
      `Con base en tus datos de pulsera, el estado actual es: ${wearablesSummary}. ` +
      `Para tu pregunta (“${question}”), te recomiendo: 1) hidratarte bien y hacer movimiento suave hoy, ` +
      "2) si el sueño fue limitado, priorizar acostarte antes y reducir cafeína/pantallas por la tarde-noche, " +
      "3) si el malestar persiste o empeora, consulta a un profesional de salud. " +
      "Estas indicaciones son de bienestar y no sustituyen un diagnóstico médico."
    );
  }
}
