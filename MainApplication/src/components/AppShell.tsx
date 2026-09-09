import { Outlet } from "react-router-dom";
import { PlayerBar } from "./PlayerBar.tsx";
import { MobileNav, Sidebar } from "./Sidebar.tsx";
import { TopBar } from "./TopBar.tsx";

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-base text-neutral-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-40 pt-5 sm:px-6 md:pb-32">
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <PlayerBar />
    </div>
  );
}
