import Chat from "@/components/Chat";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <main className="min-h-screen p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">DataAgent</h1>
        <p className="text-gray-500">AI-powered data analysis assistant</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Chat interface */}
        <section>
          <Chat />
        </section>

        {/* Right column: Dashboard metrics */}
        <section>
          <Dashboard />
        </section>
      </div>
    </main>
  );
}
