import { prisma } from "@/lib/prisma";

export async function notifyUser(input: {
  userId: string;
  companyId: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
}) {
  return prisma.userNotification.create({
    data: {
      userId: input.userId,
      companyId: input.companyId,
      title: input.title,
      message: input.message,
      type: input.type ?? "info",
      link: input.link,
    },
  });
}
