import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

// Pages in the light "court" identity: landing, library, the coach's matches, create, detail and replay.
const COURT_ROUTES = [
  /^\/$/,
  /^\/public-matches(\/\d+\/replay)?\/?$/,
  /^\/players(\/[^/]+)?\/?$/,
  /^\/scouting(\/.*)?$/,
  /^\/my-matches\/?$/,
  /^\/matches\/create\/?$/,
  /^\/matches\/\d+(\/replay)?\/?$/,
];

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isCourtPage = COURT_ROUTES.some(route => route.test(location.pathname));

  useEffect(() => {
    document.body.classList.toggle('theme-court', isCourtPage);
    return () => document.body.classList.remove('theme-court');
  }, [isCourtPage]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className={isAuthPage ? "flex-1 w-full" : "flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6"}>
        <Outlet />
      </main>
      {/* Only the landing page needs an ending; work pages stop where the work stops. */}
      {location.pathname === '/' && <Footer />}
    </div>
  );
};
