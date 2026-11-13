import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RutaPrivada, RutaPublica } from './components/RutasProtegidas';
import { AuthProvider } from './context/AuthContext';
import { BaseTecnicaPage } from './pages/BaseTecnicaPage';
import { ElegirUsuarioPage, RutaElegirUsuario } from './pages/ElegirUsuarioPage';
import { PanelPage } from './pages/PanelPage';
import { RegistroPage } from './pages/RegistroPage';
import {
  HelpPage,
  HomePage,
  LoginPage,
  NotFoundPage,
  ProfilePage,
  RoomPage,
} from './pages/SiteMapPages';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route element={<RutaPublica />}>
            <Route path="/ingresar" element={<LoginPage />} />
            <Route path="/registro" element={<RegistroPage />} />
          </Route>
          <Route element={<RutaElegirUsuario />}>
            <Route path="/registro/usuario" element={<ElegirUsuarioPage />} />
          </Route>
          <Route element={<RutaPrivada />}>
            <Route path="/panel" element={<PanelPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/salas/:id" element={<RoomPage />} />
          </Route>
          <Route path="/ayuda" element={<HelpPage />} />
          <Route path="/base-tecnica" element={<BaseTecnicaPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
