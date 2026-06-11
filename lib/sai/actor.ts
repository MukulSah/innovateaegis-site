import "server-only";

import { getCurrentUser } from "./current-user.server";
import { displayName } from "./current-user.types";

export type Actor = {
  userId: string | null;
  name: string;
  type: "user" | "system" | "agent";
};

export async function getActor(): Promise<Actor> {
  const ctx = await getCurrentUser();
  if (!ctx) {
    return { userId: null, name: "SAI", type: "system" };
  }
  return {
    userId: ctx.user.id,
    name: displayName(ctx.profile),
    type: "user",
  };
}
