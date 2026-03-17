import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const dashboard = await this.getDashboard();
    return {
      totalConversations: dashboard.statsData.totalConversations,
      resolutionRate: dashboard.statsData.resolutionRate,
      avgResponseTime: dashboard.statsData.avgResponseTime,
      citizenSatisfaction: dashboard.statsData.citizenSatisfaction,
      activeLanguages: dashboard.statsData.activeLanguages,
      activeSources: dashboard.statsData.activeSources,
      totalContents: dashboard.statsData.totalContents,
      generatedAt: new Date().toISOString(),
    };
  }

  async getDashboard() {
    const now = new Date();
    const days = 30;
    const dayMs = 24 * 60 * 60 * 1000;
    const windowStart = new Date(now.getTime() - days * dayMs);
    const previousStart = new Date(now.getTime() - days * 2 * dayMs);

    const [
      currentConversations,
      previousConversations,
      sourcesSynced,
      totalContents,
      assistantMessages,
      messagesForTiming,
      userMessagesWindow,
      unresolvedAssistantPairs,
    ] = await Promise.all([
      this.prisma.conversation.count({ where: { createdAt: { gte: windowStart } } }),
      this.prisma.conversation.count({
        where: {
          createdAt: {
            gte: previousStart,
            lt: windowStart,
          },
        },
      }),
      this.prisma.source.count({ where: { status: "synced" } }),
      this.prisma.controlledResponse.count(),
      this.prisma.message.findMany({
        where: {
          role: "assistant",
          conversation: { createdAt: { gte: windowStart } },
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          _count: {
            select: { citations: true },
          },
        },
      }),
      this.prisma.message.findMany({
        where: {
          conversation: { createdAt: { gte: windowStart } },
        },
        select: {
          conversationId: true,
          role: true,
          content: true,
          createdAt: true,
        },
        orderBy: [{ conversationId: "asc" }, { createdAt: "asc" }],
      }),
      this.prisma.message.findMany({
        where: {
          role: "user",
          conversation: { createdAt: { gte: previousStart } },
        },
        select: {
          content: true,
          createdAt: true,
          conversationId: true,
        },
      }),
      this.prisma.message.findMany({
        where: {
          role: "assistant",
          conversation: { createdAt: { gte: windowStart } },
        },
        select: {
          content: true,
          createdAt: true,
          conversationId: true,
        },
      }),
    ]);

    const activeLanguages = (
      await this.prisma.conversation.findMany({
        where: { createdAt: { gte: windowStart } },
        select: { language: true },
        distinct: ["language"],
      })
    ).length;

    const assistantCount = assistantMessages.length;
    const uncertainCount = assistantMessages.filter((message) =>
      this.isUncertainResponse(message.content),
    ).length;
    const resolvedCount = Math.max(assistantCount - uncertainCount, 0);
    const resolutionRate = assistantCount > 0 ? (resolvedCount / assistantCount) * 100 : 0;

    const citationBackedCount = assistantMessages.filter((message) => message._count.citations > 0).length;
    const precision = assistantCount > 0 ? (citationBackedCount / assistantCount) * 100 : 0;
    const informativeCount = assistantMessages.filter((message) => message.content.trim().length >= 180).length;
    const completeness = assistantCount > 0 ? (informativeCount / assistantCount) * 100 : 0;

    const responseTimesMs: number[] = [];
    const previousUserByConversation = new Map<string, Date>();
    for (const message of messagesForTiming) {
      if (message.role === "user") {
        previousUserByConversation.set(message.conversationId, message.createdAt);
      } else if (message.role === "assistant") {
        const userAt = previousUserByConversation.get(message.conversationId);
        if (userAt) {
          const diff = message.createdAt.getTime() - userAt.getTime();
          if (diff >= 0 && diff <= 120_000) {
            responseTimesMs.push(diff);
          }
          previousUserByConversation.delete(message.conversationId);
        }
      }
    }
    const avgResponseTimeMs =
      responseTimesMs.length > 0
        ? responseTimesMs.reduce((acc, value) => acc + value, 0) / responseTimesMs.length
        : 0;
    const avgResponseTimeSeconds = avgResponseTimeMs / 1000;
    const fastResponses = responseTimesMs.filter((ms) => ms <= 3_000).length;
    const speedScore = responseTimesMs.length > 0 ? (fastResponses / responseTimesMs.length) * 100 : 0;

    const qualityMetrics = [
      { label: "Precision de respuestas", value: this.round1(precision), target: 95 },
      { label: "Completitud informativa", value: this.round1(completeness), target: 90 },
      { label: "Velocidad percibida", value: this.round1(speedScore), target: 92 },
      {
        label: "Satisfaccion general",
        value: this.round1((precision + completeness + speedScore) / 3),
        target: 90,
      },
    ];

    const hourlyCounts = Array.from({ length: 12 }, (_, index) => ({
      hour: String(index * 2).padStart(2, "0"),
      value: 0,
    }));
    for (const message of userMessagesWindow) {
      if (message.createdAt < windowStart) continue;
      const hour = message.createdAt.getHours();
      const bucket = Math.floor(hour / 2);
      if (hourlyCounts[bucket]) {
        hourlyCounts[bucket].value += 1;
      }
    }

    const unresolvedByQuestion = new Map<string, { question: string; count: number; lastAskedAt: Date }>();
    const latestUserByConversation = new Map<string, { content: string; createdAt: Date }>();
    for (const message of messagesForTiming) {
      if (message.role === "user") {
        latestUserByConversation.set(message.conversationId, {
          content: message.content,
          createdAt: message.createdAt,
        });
      } else if (message.role === "assistant" && this.isUncertainResponse(message.content)) {
        const user = latestUserByConversation.get(message.conversationId);
        if (!user) continue;
        const key = this.normalizeText(user.content);
        const current = unresolvedByQuestion.get(key);
        if (current) {
          current.count += 1;
          if (user.createdAt > current.lastAskedAt) current.lastAskedAt = user.createdAt;
        } else {
          unresolvedByQuestion.set(key, {
            question: user.content,
            count: 1,
            lastAskedAt: user.createdAt,
          });
        }
      }
    }

    const unresolvedQuestions = Array.from(unresolvedByQuestion.values())
      .sort((a, b) => b.count - a.count || b.lastAskedAt.getTime() - a.lastAskedAt.getTime())
      .slice(0, 30)
      .map((row) => ({
        question: row.question,
        count: row.count,
        lastAsked: this.formatRelativeDay(row.lastAskedAt, now),
      }));

    const frequentByNormalized = new Map<string, { question: string; count: number }>();
    for (const message of messagesForTiming) {
      if (message.role !== "user") continue;
      const key = this.normalizeText(message.content);
      if (!key) continue;
      const current = frequentByNormalized.get(key);
      if (current) {
        current.count += 1;
      } else {
        frequentByNormalized.set(key, { question: message.content, count: 1 });
      }
    }
    const frequentQuestions = Array.from(frequentByNormalized.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const topicRules = [
      { topic: "Playas y calas", keywords: ["playa", "cala", "chiringuito", "mar"] },
      { topic: "Eventos y fiestas", keywords: ["evento", "fiesta", "agenda", "festival", "feria"] },
      { topic: "Restaurantes", keywords: ["restaurante", "comer", "cena", "tapa", "bar"] },
      { topic: "Transporte publico", keywords: ["bus", "autobus", "tren", "transporte", "taxi"] },
      { topic: "Alojamiento", keywords: ["hotel", "apartamento", "alojamiento", "hostal"] },
      { topic: "Lugares de interes", keywords: ["museo", "parque", "monumento", "ruta", "visita"] },
    ] as const;

    const topicCurrent = new Map<string, number>();
    const topicPrevious = new Map<string, number>();
    for (const rule of topicRules) {
      topicCurrent.set(rule.topic, 0);
      topicPrevious.set(rule.topic, 0);
    }

    for (const message of userMessagesWindow) {
      const normalized = this.normalizeText(message.content);
      for (const rule of topicRules) {
        const hits = rule.keywords.some((keyword) => normalized.includes(keyword));
        if (!hits) continue;
        if (message.createdAt >= windowStart) {
          topicCurrent.set(rule.topic, (topicCurrent.get(rule.topic) ?? 0) + 1);
        } else {
          topicPrevious.set(rule.topic, (topicPrevious.get(rule.topic) ?? 0) + 1);
        }
      }
    }

    const topTopics = topicRules
      .map((rule) => {
        const count = topicCurrent.get(rule.topic) ?? 0;
        const previous = topicPrevious.get(rule.topic) ?? 0;
        const trendValue = previous > 0 ? ((count - previous) / previous) * 100 : count > 0 ? 100 : 0;
        const trendRounded = Math.round(trendValue);
        const trend = `${trendRounded > 0 ? "+" : ""}${trendRounded}%`;
        return { topic: rule.topic, count, trend };
      })
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const languageCounts = new Map<string, number>();
    for (const conversation of await this.prisma.conversation.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { language: true },
    })) {
      const key = conversation.language.toUpperCase();
      languageCounts.set(key, (languageCounts.get(key) ?? 0) + 1);
    }
    const totalLanguageConversations = Array.from(languageCounts.values()).reduce((acc, value) => acc + value, 0);
    const languageDistribution = Array.from(languageCounts.entries())
      .map(([code, count]) => ({
        language: this.languageLabel(code),
        code,
        percentage:
          totalLanguageConversations > 0 ? Math.round((count / totalLanguageConversations) * 100) : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    const statsData = {
      totalConversations: currentConversations,
      resolutionRate: this.round1(resolutionRate),
      avgResponseTime: this.round1(avgResponseTimeSeconds),
      citizenSatisfaction: this.round1((precision + completeness + speedScore) / 30),
      activeLanguages,
      activeSources: sourcesSynced,
      totalContents,
      conversationDelta: this.percentDelta(currentConversations, previousConversations),
      resolutionDelta: this.percentDelta(resolvedCount, Math.max(previousConversations, 1)),
      avgResponseDelta: 0,
      languagesDelta: 0,
    };

    return {
      statsData,
      hourlyDistribution: hourlyCounts,
      qualityMetrics,
      unresolvedQuestions,
      frequentQuestions,
      topTopics,
      languageDistribution,
      recentAlerts: unresolvedAssistantPairs.length > 0
        ? [
            {
              id: "missing-context",
              type: "warning",
              message: `${unresolvedAssistantPairs.length} respuestas con baja confianza en los ultimos ${days} dias`,
              time: "Reciente",
            },
          ]
        : [],
    };
  }

  private isUncertainResponse(content: string) {
    const normalized = this.normalizeText(content);
    return (
      normalized.includes("no dispongo de una fuente fiable") ||
      normalized.includes("no dispongo de contexto suficiente")
    );
  }

  private normalizeText(input: string) {
    return input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private formatRelativeDay(date: Date, now: Date) {
    const midnightNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const midnightDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const diffDays = Math.round((midnightNow - midnightDate) / (24 * 60 * 60 * 1000));
    if (diffDays <= 0) return "Hoy";
    if (diffDays === 1) return "Ayer";
    return `Hace ${diffDays} dias`;
  }

  private percentDelta(current: number, previous: number) {
    if (previous <= 0) {
      return current > 0 ? 100 : 0;
    }
    return this.round1(((current - previous) / previous) * 100);
  }

  private round1(value: number) {
    return Math.round(value * 10) / 10;
  }

  private languageLabel(code: string) {
    if (code === "ES") return "Espanol";
    if (code === "EN") return "English";
    if (code === "FR") return "Francais";
    if (code === "DE") return "Deutsch";
    return code;
  }
}
