import "@/App.css";
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import LandingPage from "@/pages/LandingPage";
import RegisterPage from "@/pages/RegisterPage";

// Halaman admin hanya dipakai panitia, bukan pengunjung publik — dipisah
// jadi chunk sendiri agar pengunjung tidak perlu mengunduh kodenya.
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/daftar" element={<RegisterPage />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster theme="dark" richColors position="top-center" />
    </div>
  );
}

export default App;
