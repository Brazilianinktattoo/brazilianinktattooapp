import { blockChefePiercing, requireProfile } from "@/lib/auth";
import { todayParam } from "@/lib/date";
import { AdminDashboard } from "./admin-dashboard";
import { DayView } from "./day-view";

export default async function HomePage() {
  const { user, profile } = await requireProfile();
  await blockChefePiercing(profile);

  if (profile.role === "admin") {
    return <AdminDashboard />;
  }

  return <DayView dateParam={todayParam()} user={user} profile={profile} />;
}
