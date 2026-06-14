import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Smartphone, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const STORAGE_KEY = 'b2b-crm:pwa-install-dismissed';

export default function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) === 'true' : false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    setIsInstalled(mediaQuery.matches || window.navigator.standalone === true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const card = useMemo(() => {
    if (needRefresh) {
      return {
        icon: RefreshCw,
        iconClassName: 'bg-amber-100 text-amber-600',
        title: 'Yeni sürüm hazır',
        description: 'Performans ve görünüm iyileştirmeleri için uygulamayı güncelleyin.',
        actionLabel: 'Güncelle',
        action: () => updateServiceWorker(true),
      };
    }

    if (offlineReady) {
      return {
        icon: Smartphone,
        iconClassName: 'bg-emerald-100 text-emerald-600',
        title: 'Çevrimdışı kullanım hazır',
        description: 'Uygulama artık zayıf bağlantılarda da daha stabil çalışır.',
        actionLabel: 'Tamam',
        action: () => setOfflineReady(false),
      };
    }

    if (installPrompt && !isInstalled && !isDismissed) {
      return {
        icon: Download,
        iconClassName: 'bg-blue-100 text-blue-600',
        title: 'Ana ekrana ekleyin',
        description: 'PWA olarak kurup daha hızlı açılış, tam ekran deneyim ve mobil kullanım kazanın.',
        actionLabel: 'Yükle',
        action: async () => {
          installPrompt.prompt();
          await installPrompt.userChoice;
          setInstallPrompt(null);
        },
      };
    }

    return null;
  }, [installPrompt, isDismissed, isInstalled, needRefresh, offlineReady, setOfflineReady, updateServiceWorker]);

  const handleClose = () => {
    if (needRefresh) {
      setNeedRefresh(false);
      return;
    }

    if (offlineReady) {
      setOfflineReady(false);
      return;
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    }
    setIsDismissed(true);
  };

  if (!card) return null;

  const Icon = card.icon;

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex justify-center sm:inset-x-auto sm:right-4 sm:w-auto lg:bottom-6">
      <div className="pointer-events-auto w-full max-w-sm rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.14)] backdrop-blur">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-2xl p-3 ${card.iconClassName}`}>
            <Icon className={`h-5 w-5 ${needRefresh ? 'animate-spin' : ''}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{card.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{card.description}</p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={card.action}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                {card.actionLabel}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Kapat
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Bildirimi kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
