import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await hash("password123", 10);
  const editorPasswordHash = await hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "admin@torremolinos.es" },
    create: {
      email: "admin@torremolinos.es",
      fullName: "Admin Torremolinos",
      passwordHash: adminPasswordHash,
      role: "admin",
      status: "active",
      mfaEnabled: true,
      mfaSecret: "123456",
      modules: ["Todos"],
    },
    update: {
      fullName: "Admin Torremolinos",
      role: "admin",
      status: "active",
      modules: ["Todos"],
    },
  });

  await prisma.user.upsert({
    where: { email: "editor@torremolinos.es" },
    create: {
      email: "editor@torremolinos.es",
      fullName: "Editor Turismo",
      passwordHash: editorPasswordHash,
      role: "editor",
      status: "active",
      mfaEnabled: true,
      modules: ["Contenidos", "Fuentes", "Entrenamiento"],
    },
    update: {
      fullName: "Editor Turismo",
      role: "editor",
      status: "active",
      modules: ["Contenidos", "Fuentes", "Entrenamiento"],
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
