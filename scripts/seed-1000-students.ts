// Adds 1000 students to one existing section.
// Usage:
//   npm run seed:1000-students
//
// All 1000 students are added specifically to the existing CSE-1A section.
//
// Password format:
//   FirstName@1234

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const COUNT = Number(process.argv[2]) || 1000;
const EMAIL_DOMAIN = "student.college.edu";
const TARGET_SECTION_NAME = "CSE-1A";

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna",
  "Ishaan", "Rohan", "Kabir", "Ananya", "Diya", "Saanvi", "Aadhya", "Myra",
  "Anika", "Ira", "Pari", "Riya", "Kavya", "Meera", "Neha", "Priya", "Zara",
  "Aryan", "Dhruv", "Karthik", "Nikhil", "Rahul", "Sameer", "Tanvi", "Uday",
  "Varun", "Yash", "Aisha", "Bhavya", "Chitra", "Divya", "Esha", "Farah",
  "Gauri", "Hema", "Ishita", "Jhanvi", "Kiran", "Lavanya", "Madhavi", "Nandini",
  "Omkar", "Pranav",
];

const LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Kumar", "Singh", "Patel", "Reddy", "Rao",
  "Nair", "Iyer", "Menon", "Pillai", "Das", "Bose", "Chatterjee", "Mukherjee",
  "Joshi", "Malhotra", "Kapoor", "Chopra", "Bhatt", "Desai", "Shah", "Mehta",
  "Agarwal", "Bansal", "Chawla", "Dutta", "Ghosh", "Hegde", "Iyengar", "Jain",
  "Khanna", "Lal", "Mishra", "Naidu", "Pandey", "Qureshi", "Rane", "Saxena",
  "Trivedi", "Upadhyay", "Venkatesh", "Yadav", "Rajan", "Nambiar", "Bhatia",
  "Chandra", "Dubey", "Krishnan",
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sectionCode(sectionName: string) {
  return sectionName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function makeStudent(index: number) {
  const firstName = randomFrom(FIRST_NAMES);
  const lastName = randomFrom(LAST_NAMES);
  const name = `${firstName} ${lastName}`;

  return {
    name,
    firstName,
    email: "",
    rollNumber: "",
    password: `${firstName}@1234`,
  };
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const section = await prisma.section.findFirst({
      where: { name: TARGET_SECTION_NAME },
      orderBy: { createdAt: "asc" },
    });

    if (!section) {
      throw new Error(
        `Section "${TARGET_SECTION_NAME}" was not found. Create it first in Admin > Sections.`
      );
    }

    const assignments = await prisma.subjectSection.findMany({
      where: { sectionId: section.id },
      select: { id: true },
    });

    const existingEmails = new Set(
      (await prisma.user.findMany({ select: { email: true } })).map((u) => u.email)
    );
    const existingRollNumbers = new Set(
      (await prisma.student.findMany({ select: { rollNumber: true } })).map(
        (s) => s.rollNumber
      )
    );

    const code = sectionCode(section.name);
    let seq = 1;

    // Preserve the same roll-number format as seed-students.ts:
    // YY + SECTIONCODE + 3-digit sequence, e.g. 25CSE1A001.
    const rollPrefix = `${section.year.toString().slice(-2)}${code}`;

    const planned = [];

    while (planned.length < COUNT) {
      const firstName = randomFrom(FIRST_NAMES);
      const lastName = randomFrom(LAST_NAMES);
      const name = `${firstName} ${lastName}`;

      const emailSuffix = Math.floor(1000 + Math.random() * 9000);
      const email = `${firstName}.${lastName}${emailSuffix}@${EMAIL_DOMAIN}`
        .toLowerCase()
        .replace(/[^a-z0-9.@]/g, "");

      if (existingEmails.has(email)) continue;

      while (existingRollNumbers.has(`${rollPrefix}${String(seq).padStart(3, "0")}`)) {
        seq++;
      }

      const rollNumber = `${rollPrefix}${String(seq).padStart(3, "0")}`;
      seq++;

      existingEmails.add(email);
      existingRollNumbers.add(rollNumber);

      planned.push({
        name,
        email,
        rollNumber,
        password: `${firstName}@1234`,
      });
    }

    console.log(
      `Adding ${planned.length} randomized students to section ${section.name} (${section.id})`
    );
    console.log(`Roll format: ${rollPrefix}001, ${rollPrefix}002, ...`);
    console.log(`Password format: FirstName@1234`);

    let created = 0;
    let failed = 0;

    for (const s of planned) {
      try {
        await prisma.$transaction(async (tx) => {
          const passwordHash = await bcrypt.hash(s.password, 10);

          const user = await tx.user.create({
            data: {
              name: s.name,
              email: s.email,
              passwordHash,
              role: "STUDENT",
            },
          });

          const student = await tx.student.create({
            data: {
              userId: user.id,
              rollNumber: s.rollNumber,
              sectionId: section.id,
            },
          });

          if (assignments.length > 0) {
            await tx.enrollment.createMany({
              data: assignments.map((assignment) => ({
                studentId: student.id,
                subjectSectionId: assignment.id,
              })),
              skipDuplicates: true,
            });
          }
        });

        created++;
        if (created % 100 === 0) {
          console.log(`Created ${created}/${planned.length} students...`);
        }
      } catch (error) {
        failed++;
        console.error(`Failed to create ${s.email}:`, error);
      }
    }

    console.log(`\nDone. Created ${created} students${failed ? `, ${failed} failed` : ""}.`);
    console.log(`Section: ${section.name}`);
    console.log(`Password: FirstName@1234`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
