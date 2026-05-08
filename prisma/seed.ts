import { auth } from "../src/lib/auth";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("Seeding database...");

  const users = [
    { email: "admin@example.com", password: "password", name: "Admin", role: "admin" },
    { email: "dosen@example.com", password: "password", name: "Dosen", role: "lecturer" },
    { email: "mahasiswa@example.com", password: "password", name: "Mahasiswa", role: "student" },
  ];

  for (const user of users) {
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!existingUser) {
      console.log(`Creating user: ${user.email} (Role: ${user.role})`);
      
      // We use Better Auth's server-side API to correctly hash the password
      // Since we also added a custom 'role' field, we need to update the created user afterwards.
      // Better Auth by default doesn't accept unknown fields like 'role' unless configured via plugins.
      const response = await auth.api.signUpEmail({
        body: {
          email: user.email,
          password: user.password,
          name: user.name,
        },
      });

      if (response?.user) {
        // Update the custom role field
        await prisma.user.update({
          where: { id: response.user.id },
          data: { role: user.role },
        });
        console.log(`Successfully created ${user.email}`);
      } else {
        console.error(`Failed to create ${user.email}`, response);
      }
    } else {
      console.log(`User ${user.email} already exists. Skipping.`);
    }
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
