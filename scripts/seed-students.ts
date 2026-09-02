// Bulk-creates fake student accounts for local testing.
//
// Run with:
//   npx tsx scripts/seed-students.ts            -> adds 100 students
//   npx tsx scripts/seed-students.ts 250         -> adds 250 students
//
// Every seeded student:
//  - gets a real User row (role STUDENT) + a Student row, exactly like
//    the "Add Student" admin form creates
//  - is spread round-robin across whatever Sections already exist in
//    your database (it does NOT create sections - add at least one
//    first via Admin > Sections if you have none)
//  - is auto-enrolled into every subject already assigned to its section,
//    same as the real /api/admin/students POST route does
//  - gets a password based on the generated student's first name:
//
//        password: FirstName@1234
//
// Emails and roll numbers are generated to avoid colliding with your
// existing 11 students (or with each other), so this is safe to run
// against a database that already has real data in it.

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const COUNT = Number(process.argv[2]) || 100;
// keep this well under real DB connection limits - each unit does 2-3
// queries, so 10 in flight at once is plenty fast without hammering the pool
const BATCH_SIZE = 10;

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

// section name -> a short alnum code used inside generated roll numbers,
// e.g. "CSE-3A" -> "CSE3A"
function sectionCode(sectionName: string) {
  return sectionName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const sections = await prisma.section.findMany({
      select: { id: true, name: true, year: true },
    });

    if (sections.length === 0) {
      console.error(
        "No sections found. Create at least one section first (Admin > Sections), then re-run this script."
      );
      process.exitCode = 1;
      return;
    }

    // subject-sections per section, so we can auto-enroll each new student
    // the same way the real "Add Student" form does
    const subjectSectionsBySection = new Map<string, string[]>();
    for (const section of sections) {
      const assignments = await prisma.subjectSection.findMany({
        where: { sectionId: section.id },
        select: { id: true },
      });
      subjectSectionsBySection.set(
        section.id,
        assignments.map((a) => a.id)
      );
    }

    const existingEmails = new Set(
      (await prisma.user.findMany({ select: { email: true } })).map((u) => u.email)
    );
    const existingRollNumbers = new Set(
      (await prisma.student.findMany({ select: { rollNumber: true } })).map(
        (s) => s.rollNumber
      )
    );

    // roll numbers are per-section sequences, e.g. 23CSE3A001, 23CSE3A002...
    // continuing past whatever sequence number is already taken so this is
    // safe to re-run without collisions
    const rollSeqBySection = new Map<string, number>();

    type PlannedStudent = {
      name: string;
      email: string;
      rollNumber: string;
      sectionId: string;
    };

    const planned: PlannedStudent[] = [];
    let attempts = 0;

    while (planned.length < COUNT && attempts < COUNT * 20) {
      attempts++;

      const section = sections[planned.length % sections.length];
      const first = randomFrom(FIRST_NAMES);
      const last = randomFrom(LAST_NAMES);
      const name = `${first} ${last}`;

      const emailBase = `${first}.${last}${Math.floor(Math.random() * 10000)}`
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, "");
      const email = `${emailBase}@student.college.edu`;
      if (existingEmails.has(email)) continue;

      const code = sectionCode(section.name);
      let seq = rollSeqBySection.get(section.id) ?? 1;
      let rollNumber = `${section.year.toString().slice(-2)}${code}${String(seq).padStart(3, "0")}`;
      while (existingRollNumbers.has(rollNumber)) {
        seq++;
        rollNumber = `${section.year.toString().slice(-2)}${code}${String(seq).padStart(3, "0")}`;
      }
      rollSeqBySection.set(section.id, seq + 1);

      existingEmails.add(email);
      existingRollNumbers.add(rollNumber);

      planned.push({ name, email, rollNumber, sectionId: section.id });
    }

    if (planned.length < COUNT) {
      console.warn(
        `Only generated ${planned.length}/${COUNT} unique students after ${attempts} attempts - proceeding with what was generated.`
      );
    }

    console.log(`Creating ${planned.length} students across ${sections.length} section(s)...`);

    let created = 0;
    let failed = 0;

    for (let i = 0; i < planned.length; i += BATCH_SIZE) {
      const batch = planned.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((s) =>
          prisma.$transaction(async (tx) => {
            const firstName = s.name.trim().split(/\s+/)[0];
            const password = `${firstName}@1234`;
            const passwordHash = await bcrypt.hash(password, 10);

            const user = await tx.user.create({
              data: { name: s.name, email: s.email, passwordHash, role: "STUDENT" },
            });

            const student = await tx.student.create({
              data: { userId: user.id, rollNumber: s.rollNumber, sectionId: s.sectionId },
            });

            const assignments = subjectSectionsBySection.get(s.sectionId) ?? [];
            if (assignments.length > 0) {
              await tx.enrollment.createMany({
                data: assignments.map((subjectSectionId) => ({
                  studentId: student.id,
                  subjectSectionId,
                })),
                skipDuplicates: true,
              });
            }

            return student;
          })
        )
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          created++;
        } else {
          failed++;
          console.error("Failed to create a student:", result.reason);
        }
      }

      console.log(`  ${Math.min(i + BATCH_SIZE, planned.length)}/${planned.length}`);
    }

    console.log(`\nDone. Created ${created} students${failed > 0 ? `, ${failed} failed` : ""}.`);
    console.log(`Each seeded student gets the password: FirstName@1234`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
