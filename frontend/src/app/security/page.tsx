import AuthGuard from "@/components/AuthGuard";
import SecurityContent from "@/components/SecurityContent";

export default function SecurityPage() {
  return (
    <AuthGuard requiredRole="admin">
      <SecurityContent />
    </AuthGuard>
  );
}
