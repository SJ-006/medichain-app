import React from 'react';
import { useStore } from '../context/Store';
import { Activity, LogOut, ShieldCheck, Database, MapPin } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentUser, logout, isGeoFenced, toggleGeoFence } = useStore();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Activity className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600">
                MediChain
              </span>
            </div>

            <div className="flex items-center gap-6">
              {currentUser && (
                <>
                  <div className="hidden md:flex flex-col items-end mr-4">
                    <span className="text-sm font-semibold">{currentUser.name}</span>
                    <span className="text-xs text-slate-500 uppercase tracking-wide">{currentUser.role}</span>
                  </div>

                  {currentUser.role === 'DOCTOR' && (
                    <button
                      onClick={toggleGeoFence}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${isGeoFenced ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                    >
                      <MapPin size={12} />
                      {isGeoFenced ? 'Loc: Hospital' : 'Loc: Away'}
                    </button>
                  )}

                  <button
                    onClick={logout}
                    className="p-2 text-slate-500 hover:text-danger transition-colors"
                  >
                    <LogOut size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>


    </div>
  );
};