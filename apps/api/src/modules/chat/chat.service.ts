import { Injectable } from "@nestjs/common";

@Injectable()
export class ChatService {
  getBootstrap() {
    return {
      chatMessages: [
        {
          id: "1",
          role: "user",
          content: "Hola, que playas recomiendas hoy en Torremolinos?",
          timestamp: "10:32",
        },
        {
          id: "2",
          role: "assistant",
          content:
            "Te recomiendo Playa de la Carihuela y Bajondillo. Ambas tienen servicios activos y buena accesibilidad.",
          timestamp: "10:32",
          sources: ["Guia de playas oficial", "Portal de Turismo"],
        },
      ],
      suggestedQuestions: [
        "Donde puedo comer buen pescado?",
        "Como llego al centro en bus?",
        "Que horario tiene la oficina de turismo?",
        "Hay rutas de senderismo cerca?",
      ],
    };
  }
}
