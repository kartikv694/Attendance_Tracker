/**
 * Generates the default password used for student accounts.
 * Example: "Kartik Verma" -> "Kartik@1234"
 */
export function generateStudentPassword(name: string): string {
  const firstName = name.trim().split(/\s+/)[0];
  if (!firstName) {
    throw new Error("Student name is required");
  }

  return `${firstName}@1234`;
}
