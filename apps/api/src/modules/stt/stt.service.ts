import { BadRequestException, Injectable } from "@nestjs/common";

type TranscriptionResponse = {
  text?: string;
  language?: string;
};

@Injectable()
export class SttService {
  async transcribe(file: { originalname: string; buffer: Buffer; mimetype?: string }) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new BadRequestException("OPENAI_API_KEY no configurada para STT.");
    }
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException("Archivo de audio vacio.");
    }

    const formData = new FormData();
    const blob = new Blob([Uint8Array.from(file.buffer)], {
      type: file.mimetype || "audio/webm",
    });
    formData.append("file", blob, file.originalname || "audio.webm");
    formData.append("model", process.env.STT_OPENAI_MODEL || "whisper-1");
    formData.append("language", process.env.STT_LANGUAGE || "es");
    formData.append("response_format", "json");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new BadRequestException(`Fallo en STT: ${detail || response.statusText}`);
    }

    const payload = (await response.json()) as TranscriptionResponse;
    const text = (payload.text || "").trim();
    if (!text) {
      throw new BadRequestException("No se pudo transcribir audio.");
    }

    const detectedLanguage = this.normalizeLanguage(payload.language);
    return {
      text,
      detectedLanguage,
      confidence: 0.9,
    };
  }

  private normalizeLanguage(language?: string) {
    const raw = (language || "").toLowerCase();
    if (raw.startsWith("es")) return "ES";
    if (raw.startsWith("en")) return "EN";
    if (raw.startsWith("fr")) return "FR";
    if (raw.startsWith("de")) return "DE";
    return "ES";
  }
}
