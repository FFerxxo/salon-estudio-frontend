import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { BaseTecnicaPage } from './pages/BaseTecnicaPage';
import {
  DashboardPage,
  HelpPage,
  HomePage,
  LoginPage,
  NotFoundPage,
  ProfilePage,
  RegisterPage,
  RoomPage,
} from './pages/SiteMapPages';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/ingresar" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/panel" element={<DashboardPage />} />
        <Route path="/perfil" element={<ProfilePage />} />
        <Route path="/salas/:id" element={<RoomPage />} />
        <Route path="/ayuda" element={<HelpPage />} />
        <Route path="/base-tecnica" element={<BaseTecnicaPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
