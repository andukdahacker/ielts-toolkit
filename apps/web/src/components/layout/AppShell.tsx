import { Outlet } from "react-router"

export function AppShell() {
  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r bg-card p-4">
        <h1 className="text-lg font-bold">IELTS Toolkit</h1>
        <nav className="mt-6 space-y-2">
          <p className="text-sm text-muted-foreground">Dashboard</p>
          <p className="text-sm text-muted-foreground">Grade</p>
          <p className="text-sm text-muted-foreground">Assignments</p>
          <p className="text-sm text-muted-foreground">Classes</p>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
