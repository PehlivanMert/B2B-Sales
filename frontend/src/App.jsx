import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CrmProvider } from './context/CrmContext';
import { AgenciesProvider } from './context/AgenciesContext';
import { CompaniesProvider } from './context/CompaniesContext';
import { CompanyCrmProvider } from './context/CompanyCrmContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AgenciesPage from './pages/agencies/AgenciesPage';
import CompaniesPage from './pages/companies/CompaniesPage';
import MapPage from './pages/map/MapPage';
import SettingsPage from './pages/settings/SettingsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <AgenciesProvider>
                <CrmProvider>
                  <CompaniesProvider>
                    <CompanyCrmProvider>
                      <Layout />
                    </CompanyCrmProvider>
                  </CompaniesProvider>
                </CrmProvider>
              </AgenciesProvider>
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="agencies" element={<AgenciesPage />} />
            <Route path="companies" element={<CompaniesPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
