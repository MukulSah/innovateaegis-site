import { prisma } from "@/lib/prisma";

const DEFAULT_COMPANY_SLUG = "innovateaegis";

export async function getDefaultCompany() {
  const company = await prisma.company.findUnique({
    where: { slug: DEFAULT_COMPANY_SLUG },
  });

  if (!company) {
    throw new Error("Company not seeded. Run: npx prisma db seed");
  }

  return company;
}

export async function getCompanyId() {
  const company = await getDefaultCompany();
  return company.id;
}
