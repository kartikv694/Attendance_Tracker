// Resets every existing STUDENT account password to:
//   FirstName@1234
//
// Example:
//   Kartik Verma -> Kartik@1234
//
// Run:
//   npm run reset:student-passwords
//
// This changes only student passwords. Teacher/admin passwords are untouched.

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function passwordForName(name: string) {
  const firstName = name.trim().split(/\s+/)[0];
  if (!firstName) throw new Error("A student has an empty name.");
  return `${firstName}@1234`;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const students = await prisma.student.findMany({
      include: { user: { select: { id: true, name: true, role: true } } },
    });

    console.log(`Found ${students.length} student(s). Updating passwords...`);

    for (const student of students) {
      const password = passwordForName(student.user.name);
      const passwordHash = await bcrypt.hash(password, 10);

      await prisma.user.update({
        where: { id: student.user.id },
        data: { passwordHash },
      });

      console.log(`  ${student.user.name}: ${password}`);
    }

    console.log(`\nDone. Updated ${students.length} student password(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
