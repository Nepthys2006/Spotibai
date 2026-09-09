import { useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { PlayerBar } from "./PlayerBar.tsx";
import { QueuePanel } from "./QueuePanel.tsx";
import { MobileNav, Sidebar } from "./Sidebar.tsx";
import { TopBar } from "./TopBar.tsx";

export function AppShell() {
  const stackRef = useRef<HTMLDivElement>(null);

  // Measure the docked nav+player stack so offsets track it exactly.
  useEffect(() => {
    const el = stackRef.current;
    if (!el) return;
    const write = () => {
      document.documentElement.style.setProperty(
        "--bottom-stack-h",
        `${Math.ceil(el.getBoundingClientRect().height)}px`,
      );
    };
    write();
    const ro = new ResizeObserver(write);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex min-h-screen bg-base text-neutral-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-[calc(var(--bottom-stack-h,256px)+16px)] pt-5 sm:px-6 md:pb-32">
          <Outlet />
        </main>
      </div>
      <div ref={stackRef} className="fixed inset-x-0 bottom-0 z-40 flex flex-col">
        <MobileNav />
        <PlayerBar />
      </div>
      <QueuePanel />
    </div>
  );
}
