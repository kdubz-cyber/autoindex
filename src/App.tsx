import { useEffect, useState } from 'react';
import { TopNav } from './components/layout/TopNav';
import { Footer } from './components/layout/Footer';
import LegacyWorkspace from './pages/LegacyWorkspace';
import { HomePage } from './pages/HomePage';
import { MarketplaceAnalysisPage } from './pages/MarketplaceAnalysisPage';
import { AboutPage } from './pages/AboutPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';

function normalizeBasePath(base: string) {
  if (!base || base === '/') return '/';
  const withLead = base.startsWith('/') ? base : `/${base}`;
  return withLead.endsWith('/') ? withLead.slice(0, -1) : withLead;
}

const BASE_PATH = normalizeBasePath(import.meta.env.VITE_BASE_PATH || '/');

function toAppPath(pathname: string) {
  if (BASE_PATH === '/') return pathname || '/';
  if (pathname.startsWith(BASE_PATH)) {
    const stripped = pathname.slice(BASE_PATH.length);
    return stripped || '/';
  }
  return pathname || '/';
}

function toHref(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (BASE_PATH === '/') return normalized;
  return `${BASE_PATH}${normalized === '/' ? '' : normalized}`;
}

function routeKey(path: string) {
  const clean = path.split('?')[0].split('#')[0] || '/';
  if (clean === '/') return '/';
  const mapped = clean.replace(/\/+$/, '');
  return mapped || '/';
}

export default function App() {
  const [path, setPath] = useState(() => routeKey(toAppPath(window.location.pathname)));
  const [embedMode, setEmbedMode] = useState(
    () => new URLSearchParams(window.location.search).get('embed') === '1'
  );

  useEffect(() => {
    const storedRedirect = sessionStorage.getItem('spa_redirect_path');
    if (storedRedirect) {
      sessionStorage.removeItem('spa_redirect_path');
      const url = new URL(storedRedirect, window.location.origin);
      const appPath = routeKey(toAppPath(url.pathname));
      window.history.replaceState({}, '', `${toHref(appPath)}${url.search}`);
      setPath(appPath);
      setEmbedMode(new URLSearchParams(url.search).get('embed') === '1');
    }

    const onPop = () => {
      setPath(routeKey(toAppPath(window.location.pathname)));
      setEmbedMode(new URLSearchParams(window.location.search).get('embed') === '1');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (nextPath: string) => {
    const target = routeKey(nextPath);
    if (target === path) return;
    const query = embedMode ? '?embed=1' : '';
    window.history.pushState({}, '', `${toHref(target)}${query}`);
    setPath(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Marketplace Analysis', path: '/analysis' },
    { label: 'About', path: '/about' }
  ];

  useEffect(() => {
    const map: Record<string, string> = {
      '/': 'AutoIndex | Marketplace Part Valuation',
      '/analysis': 'Marketplace Analysis | AutoIndex',
      '/about': 'About | AutoIndex',
      '/privacy': 'Privacy Policy | AutoIndex',
      '/terms': 'Terms of Use | AutoIndex',
      '/workspace': 'Workspace | AutoIndex'
    };
    document.title = map[path] || map['/'];
  }, [path]);

  const page = (() => {
    if (path === '/analysis') return <MarketplaceAnalysisPage />;
    if (path === '/about') return <AboutPage />;
    if (path === '/privacy') return <PrivacyPage />;
    if (path === '/terms') return <TermsPage />;
    if (path === '/workspace') return <LegacyWorkspace />;
    return <HomePage onNavigate={navigate} />;
  })();

  if (path === '/workspace') {
    return <LegacyWorkspace />;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <TopNav navItems={navItems} currentPath={path} onNavigate={navigate} embedMode={embedMode} />
      <main className={`mx-auto w-full max-w-[1180px] ${embedMode ? 'px-3 py-3 md:px-4 md:py-4' : 'px-4 py-6 md:px-6 md:py-8'}`}>
        {page}
      </main>
      <Footer embedMode={embedMode} onNavigate={navigate} />
    </div>
  );
}
