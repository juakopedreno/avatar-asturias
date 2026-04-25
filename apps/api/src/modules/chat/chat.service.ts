import { Injectable } from "@nestjs/common";

@Injectable()
export class ChatService {
  getBootstrap() {
    return {
      chatMessages: [
        {
          id: "1",
          role: "user",
          content: "Hola, me siento con poca energía hoy, ¿qué me recomiendas para sentirme mejor?",
          timestamp: "10:32",
        },
        {
          id: "2",
          role: "assistant",
          content:
            "Para un enfoque inicial, te recomiendo hidratación, respiración guiada y una rutina suave de movilidad. Si persiste el malestar, consulta con un profesional de salud.",
          timestamp: "10:32",
          sources: ["Protocolo de bienestar SHA", "Guía de atención clínica"],
        },
      ],
      suggestedQuestions: [
        "¿Qué rutina de bienestar me recomiendas para hoy?",
        "¿Cómo puedo reducir el estrés de forma natural?",
        "¿Qué servicios de salud y bienestar están disponibles ahora?",
        "¿Me puedes proponer ejercicios suaves para empezar el día?",
      ],
    };
  }
}
