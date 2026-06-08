import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await hash("password123", 10);
  const editorPasswordHash = await hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "admin@asturias.es" },
    create: {
      email: "admin@asturias.es",
      fullName: "Admin Principado de Asturias",
      passwordHash: adminPasswordHash,
      role: "admin",
      status: "active",
      mfaEnabled: true,
      mfaSecret: "123456",
      modules: ["Todos"],
    },
    update: {
      fullName: "Admin Principado de Asturias",
      role: "admin",
      status: "active",
      modules: ["Todos"],
    },
  });

  await prisma.user.upsert({
    where: { email: "editor@asturias.es" },
    create: {
      email: "editor@asturias.es",
      fullName: "Editor Contenidos",
      passwordHash: editorPasswordHash,
      role: "editor",
      status: "active",
      mfaEnabled: true,
      modules: ["Contenidos", "Fuentes", "Entrenamiento"],
    },
    update: {
      fullName: "Editor Contenidos",
      role: "editor",
      status: "active",
      modules: ["Contenidos", "Fuentes", "Entrenamiento"],
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
