import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const plynestUser = await getCurrentUser("plynest");
  if (plynestUser) {
    if (plynestUser.role === "ADMIN") {
      redirect("/admin/dashboard");
    } else {
      redirect("/employee/dashboard");
    }
  }

  const hytekUser = await getCurrentUser("hytek");
  if (hytekUser) {
    redirect("/hytek/admin/dashboard");
  }

  redirect("/login");
}
