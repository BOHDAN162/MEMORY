import { getServerSession } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const HomePage = async () => {
  const session = await getServerSession();

  if (session) {
    redirect("/onboarding");
  }

  redirect("/auth");
};

export default HomePage;
