import { BrowserRouter, Route, Routes } from "react-router-dom";
import { CookieConsentBanner } from "@/components/layout/CookieConsentBanner";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AboutPage } from "@/pages/AboutPage";
import { ArtemisRequestPage } from "@/pages/ArtemisRequestPage";
import { ExternalLinksAdminPage } from "@/pages/ExternalLinksAdminPage";
import { ImprintPage } from "@/pages/ImprintPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { StartPage } from "@/pages/StartPage";
import { SupportRequestPage } from "@/pages/SupportRequestPage";
import { TUMGuestRequestPage } from "@/pages/TUMGuestRequestPage";
import { VMAccessRequestPage } from "@/pages/VMAccessRequestPage";
import { VMRequestPage } from "@/pages/VMRequestPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route
            path="/request/vm"
            element={
              <ProtectedRoute>
                <VMRequestPage />
              </ProtectedRoute>
            }
          />
          <Route path="/request/artemis" element={<ArtemisRequestPage />} />
          <Route
            path="/request/vm-access"
            element={
              <ProtectedRoute>
                <VMAccessRequestPage />
              </ProtectedRoute>
            }
          />
          <Route path="/request/tum-guest" element={<TUMGuestRequestPage />} />
          <Route path="/request/support" element={<SupportRequestPage />} />
          <Route
            path="/admin/external-links"
            element={
              <ProtectedRoute requireAdmin>
                <ExternalLinksAdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/imprint" element={<ImprintPage />} />
        </Routes>
      </AuthProvider>
      <CookieConsentBanner />
    </BrowserRouter>
  );
}

export default App;
