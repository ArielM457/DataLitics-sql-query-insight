import AuthGuard from "@/components/AuthGuard";
import HomeContent from "@/components/HomeContent";

export default function HomePage() {
  return (
    <AuthGuard>
      <HomeContent />
    </AuthGuard>
  );
}
