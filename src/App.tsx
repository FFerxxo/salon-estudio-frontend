import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute, PublicAuthRoute } from './components/RouteGuards';
import { AuthProvider, type AuthProviderProps } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { BaseTecnicaPage } from './pages/BaseTecnicaPage';
import { GoogleUsernamePage } from './pages/GoogleUsernamePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import {
  DashboardPage,
  HelpPage,
  HomePage,
  NotFoundPage,
  ProfilePage,
  RoomPage,
} from './pages/SiteMapPages';

interface AppProps {
  authOverrides?: Omit<AuthProviderProps, 'children'>;
}

export function App({ authOverrides }: AppProps = {}) {
  return (
    <ThemeProvider>
      <AuthProvider {...authOverrides}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />

            <Route element={<PublicAuthRoute />}>
              <Route path="/ingresar" element={<LoginPage />} />
              <Route path="/registro" element={<RegisterPage />} />
            </Route>

            <Route path="/registro/google-username" element={<GoogleUsernamePage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/panel" element={<DashboardPage />} />
              <Route path="/perfil" element={<ProfilePage />} />
              <Route path="/salas/:id" element={<RoomPage />} />
            </Route>

            <Route path="/ayuda" element={<HelpPage />} />
            <Route path="/base-tecnica" element={<BaseTecnicaPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
