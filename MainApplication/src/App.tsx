import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell.tsx";
import { AuthProvider } from "./lib/AuthProvider.tsx";
import { RequireAdmin } from "./lib/RequireAdmin.tsx";
import { queryClient } from "./lib/queryClient.ts";
import { Admin } from "./pages/Admin.tsx";
import { Home } from "./pages/Home.tsx";
import { Library } from "./pages/Library.tsx";
import { LikedSongs } from "./pages/LikedSongs.tsx";
import { NotFound } from "./pages/NotFound.tsx";
import { PlaylistDetail } from "./pages/PlaylistDetail.tsx";
import { Search } from "./pages/Search.tsx";
import { Login } from "./pages/auth/Login.tsx";
import { ResetPassword } from "./pages/auth/ResetPassword.tsx";
import { Signup } from "./pages/auth/Signup.tsx";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <BrowserRouter>
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
      </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
