import { createContext, useContext, useState, useEffect } from 'react';

const CompaniesContext = createContext(null);

/**
 * CompaniesProvider — /companies.json dosyasını tüm uygulama için TEK bir
 * fetch ile yükler. Dashboard, CompaniesPage ve MapPage ayrı ayrı fetch
 * açmak yerine bu context'i kullanır.
 *
 * Cache Stratejisi: Günlük timestamp ile cache busting yapılır.
 * Her sayfa geçişinde değil, sadece günde bir kez yeniden indirilir.
 */
export function CompaniesProvider({ children }) {
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);

  useEffect(() => {
    async function fetchCompanies() {
      try {
        setCompaniesLoading(true);
        // Gün bazlı cache busting (her açılışta değil, günde bir kez yenilenir)
        const dayStamp = new Date().toISOString().slice(0, 10);
        const res = await fetch(`/companies.json?d=${dayStamp}`);
        if (!res.ok) throw new Error('Şirket verisi bulunamadı');
        const data = await res.json();
        setCompanies(data);
      } catch (err) {
        console.error('CompaniesContext fetch hatası:', err);
      } finally {
        setCompaniesLoading(false);
      }
    }
    fetchCompanies();
  }, []);

  return (
    <CompaniesContext.Provider value={{ companies, companiesLoading }}>
      {children}
    </CompaniesContext.Provider>
  );
}

/** Hook: Herhangi bir bileşende statik şirket verisine erişmek için kullanılır */
export function useCompanies() {
  const ctx = useContext(CompaniesContext);
  if (!ctx) throw new Error('useCompanies() must be used within an <CompaniesProvider>');
  return ctx;
}
