import { prisma } from "@/lib/db";
import type { NotificationType } from "@prisma/client";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
    },
  });
}

export async function notifyLandlordOfBuilding(
  landlordUserId: string,
  buildingId: string,
  title: string,
  message: string
) {
  return createNotification({
    userId: landlordUserId,
    type: "BUILDING",
    title,
    message,
    link: `/dashboard/landlord/buildings/${buildingId}`,
  });
}
