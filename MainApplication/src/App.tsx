import { Suspense, lazy, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell.tsx";
import { AuthProvider } from "./lib/AuthProvider.tsx";
import { RequireAdmin } from "./lib/RequireAdmin.tsx";
import { initPredictivePreload } from "./lib/preload.ts";
import { queryClient } from "./lib/queryClient.ts";
import { Home } from "./pages/Home.tsx";
import { NotFound } from "./pages/NotFound.tsx";

const Search = lazy(() =>
  import("./pages/Search.tsx").then((m) => ({ default: m.Search })),
);
const Library = lazy(() =>
  import("./pages/Library.tsx").then((m) => ({ default: m.Library })),
);
const PlaylistDetail = lazy(() =>
  import("./pages/PlaylistDetail.tsx").then((m) => ({
    default: m.PlaylistDetail,
  })),
);
const LikedSongs = lazy(() =>
  import("./pages/LikedSongs.tsx").then((m) => ({ default: m.LikedSongs })),
);
const Admin = lazy(() =>
  import("./pages/Admin.tsx").then((m) => ({ default: m.Admin })),
);
const Signup = lazy(() =>
  import("./pages/auth/Signup.tsx").then((m) => ({ default: m.Signup })),
);
const Login = lazy(() =>
  import("./pages/auth/Login.tsx").then((m) => ({ default: m.Login })),
);
const ResetPassword = lazy(() =>
  import("./pages/auth/ResetPassword.tsx").then((m) => ({
    default: m.ResetPassword,
  })),
);

export default function App() {
  useEffect(() => {
    initPredictivePreload();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="library" element={<Library />} />
            <Route path="playlists/:id" element={<PlaylistDetail />} />
            <Route path="liked" element={<LikedSongs />} />
            <Route
              path="admin"
              element={
                <RequireAdmin>
                  <Admin />
                </RequireAdmin>
              }
            />
            <Route path="signup" element={<Signup />} />
            <Route path="login" element={<Login />} />
            <Route path="reset" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
