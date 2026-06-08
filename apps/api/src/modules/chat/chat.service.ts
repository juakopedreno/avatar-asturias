import { Injectable } from "@nestjs/common";

@Injectable()
export class ChatService {
  getBootstrap() {
    return {
      chatMessages: [
        {
          id: "1",
          role: "user",
          content: "Hola, ¿qué información tienes disponible sobre trámites y ayudas?",
          timestamp: "10:32",
        },
        {
          id: "2",
          role: "assistant",
          content:
            "Puedo orientarte con la documentación oficial que está cargada en el sistema. Cuéntame el trámite o el ámbito concreto (empleo, turismo, cultura, etc.) y te respondo con fuentes verificables.",
          timestamp: "10:32",
          sources: ["Fuentes oficiales Principado de Asturias"],
        },
      ],
      suggestedQuestions: [
        "¿Qué trámites puedo hacer de forma telemática?",
        "¿Dónde encuentro información sobre ayudas y subvenciones?",
        "¿Cómo contacto con los servicios del Principado?",
        "¿Qué documentación necesito para una solicitud habitual?",
      ],
    };
  }
}
