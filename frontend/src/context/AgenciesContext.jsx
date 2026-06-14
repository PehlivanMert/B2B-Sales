import { createContext, useContext, useState, useEffect } from 'react';

const AgenciesContext = createContext(null);

/**
 * AgenciesProvider — /agencies.json dosyasını tüm uygulama için TEK bir
 * fetch ile yükler. Dashboard, AgenciesPage ve MapPage ayrı ayrı fetch
 * açmak yerine bu context'i kullanır.
 *
 * Cache Stratejisi: Günlük timestamp ile cache busting yapılır.
 * Her sayfa geçişinde değil, sadece günde bir kez yeniden indirilir.
 */
export function AgenciesProvider({ children }) {
  const [agencies, setAgencies] = useState([]);
  const [agenciesLoading, setAgenciesLoading] = useState(true);

  useEffect(() => {
    async function fetchAgencies() {
      try {
        setAgenciesLoading(true);
        // Gün bazlı cache busting (her açılışta değil, günde bir kez yenilenir)
        const dayStamp = new Date().toISOString().slice(0, 10);
        const res = await fetch(`/agencies.json?d=${dayStamp}`);
        if (!res.ok) throw new Error('Acente verisi bulunamadı');
        const data = await res.json();
        setAgencies(data);
      } catch (err) {
        console.error('AgenciesContext fetch hatası:', err);
      } finally {
        setAgenciesLoading(false);
      }
    }
    fetchAgencies();
  }, []);

  return (
    <AgenciesContext.Provider value={{ agencies, agenciesLoading }}>
      {children}
    </AgenciesContext.Provider>
  );
}

/** Hook: Herhangi bir bileşende statik acente verisine erişmek için kullanılır */
export function useAgencies() {
  const ctx = useContext(AgenciesContext);
  if (!ctx) throw new Error('useAgencies() must be used within an <AgenciesProvider>');
  return ctx;
}
