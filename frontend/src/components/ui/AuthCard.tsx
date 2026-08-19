import React from 'react';

interface AuthCardProps {
  title: string;
  subtitle: string;
  description: string;
  children: React.ReactNode;
}

export const AuthCard: React.FC<AuthCardProps> = ({ title, subtitle, description, children }) => {
  return (
    <div className="bg-background text-on-surface min-h-screen flex items-center justify-center relative overflow-hidden font-sans">
      {/* Background Wireframe Elements */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(to right, rgba(201, 184, 232, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(201, 184, 232, 0.15) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }}></div>
      <div className="absolute inset-0 z-0 pointer-events-none" style={{
        background: 'radial-gradient(circle at 15% 50%, rgba(201, 184, 232, 0.35), transparent 25%), radial-gradient(circle at 85% 30%, rgba(232, 137, 174, 0.2), transparent 25%)'
      }}></div>

      {/* Main Container */}
      <main className="w-full max-w-[480px] px-4 md:px-0 z-10 relative">
        <div className="bg-surface-container-lowest/85 backdrop-blur-xl border border-outline-variant/60 rounded-lg p-10 flex flex-col gap-8 shadow-2xl shadow-[#e889ae]/10">

          {/* Header */}
          <div className="text-center flex flex-col items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tighter text-primary">{title}</h1>
            <h2 className="text-2xl font-semibold text-on-surface">{subtitle}</h2>
            <p className="text-on-surface-variant">{description}</p>
          </div>

          {children}

        </div>
      </main>
    </div>
  );
};