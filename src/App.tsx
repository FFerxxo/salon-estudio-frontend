import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute, PublicAuthRoute } from './components/RouteGuards';
import { AuthProvider, type AuthProviderProps } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DashboardPage } from './pages/DashboardPage';
import { GoogleUsernamePage } from './pages/GoogleUsernamePage';
import { LoginPage } from './pages/LoginPage';
import { MyRoomsPage } from './pages/MyRoomsPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { RoomPage } from './pages/RoomPage';
import {
  HelpPage,
  HomePage,
  NotFoundPage,
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
              <Route path="/salas" element={<MyRoomsPage />} />
              <Route path="/perfil" element={<ProfilePage />} />
              <Route path="/salas/:id" element={<RoomPage />} />
            </Route>

            <Route path="/ayuda" element={<HelpPage />} />
            <Route path="/base-tecnica" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
