import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { memo, useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

const Layout = memo(function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if current page is a detail page
  const isDetailPage = location.pathname.includes('-detail');

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/station-detail', label: 'Station Detail', icon: '🏭' },
    { path: '/tester-detail', label: 'Tester Detail', icon: '🔧' },
    { path: '/fixture-detail', label: 'Fixture Detail', icon: '⚙️' },
    { path: '/calibration', label: 'Calibration', icon: '🔬' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)] pointer-events-none" />
      
      {/* Navigation Bar */}
      <nav className="relative bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50 shadow-2xl shadow-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 rounded-2xl flex items-center justify-center shadow-lg border border-slate-500/30">
                <span className="text-slate-100 font-bold text-xl">Δ</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-100 tracking-tight">Delta Dashboard</h1>
                <p className="text-xs text-slate-400 font-medium">Manufacturing Analytics</p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            {!isDetailPage && (
              <div className="hidden md:flex items-center space-x-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                      location.pathname === item.path
                        ? 'bg-slate-700/80 text-slate-100 shadow-lg border border-slate-600/50'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 hover:border-slate-600/30 border border-transparent'
                    }`}
                  >
                    <span className="mr-2 text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-300 hover:text-slate-100 p-2 rounded-lg hover:bg-slate-800/60 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && !isDetailPage && (
            <div className="md:hidden border-t border-slate-700/50 py-4">
              <div className="space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      location.pathname === item.path
                        ? 'bg-slate-700/80 text-slate-100'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="mr-3 text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
});

export default Layout;