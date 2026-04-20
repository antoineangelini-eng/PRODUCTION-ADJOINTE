"use server";

import { getCurrentUserInfo } from "@/lib/delete-permission";

export async function getUserInfoAction() {
  return getCurrentUserInfo();
}
