import React from 'react';

interface AuthCardProps {
  title: string;
  subtitle: string;
  description: string;
  children: React.ReactNode;
}

export const AuthCard: React.FC<AuthCardProps> = ({ title, subtitle, description, children }) => {
  return (
    <div className="bg-[#111317] text-[#e2e2e8] min-h-screen flex items-center justify-center relative overflow-hidden font-sans">
      {/* Background Wireframe Elements */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(to right, rgba(0, 240, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 240, 255, 0.05) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }}></div>
      <div className="absolute inset-0 z-0 pointer-events-none" style={{
        background: 'radial-gradient(circle at 15% 50%, rgba(125, 1, 177, 0.15), transparent 25%), radial-gradient(circle at 85% 30%, rgba(0, 240, 255, 0.1), transparent 25%)'
      }}></div>

      {/* Main Container */}
      <main className="w-full max-w-[480px] px-4 md:px-0 z-10 relative">
        <div className="bg-[#1a1c20]/70 backdrop-blur-xl border border-[#b9cacb]/10 rounded-lg p-10 flex flex-col gap-8 shadow-2xl">
          
          {/* Header */}
          <div className="text-center flex flex-col items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tighter text-[#dbfcff]">{title}</h1>
            <h2 className="text-2xl font-semibold text-[#e2e2e8]">{subtitle}</h2>
            <p className="text-[#b9cacb]">{description}</p>
          </div>

          {children}

        </div>
      </main>
    </div>
  );
};