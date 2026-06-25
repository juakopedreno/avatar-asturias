import { Injectable } from "@nestjs/common";
import { COVA_DISPLAY_NAME, COVA_OPENING_GREETING } from "../persona/asturias-cova.prompt";

@Injectable()
export class ChatService {
  getBootstrap() {
    return {
      assistantName: COVA_DISPLAY_NAME,
      openingGreeting: COVA_OPENING_GREETING,
      chatMessages: [
        {
          id: "1",
          role: "user",
          content: "¿Qué ayudas y trámites puedo consultar?",
          timestamp: "10:32",
        },
        {
          id: "2",
          role: "assistant",
          content:
            "Puedo orientarte con la documentación oficial cargada en el sistema: ayudas, subvenciones, trámites y servicios del Principado. Cuéntame qué necesitas y te respondo con fuentes verificables.",
          timestamp: "10:32",
          sources: ["Fuentes oficiales Principado de Asturias"],
        },
      ],
      suggestedQuestions: [
        "¿Qué es CoVA?",
        "¿Qué ayudas y subvenciones hay disponibles?",
        "¿Qué trámites puedo hacer de forma telemática?",
        "¿Cómo contacto con los servicios del Principado?",
      ],
    };
  }
}
