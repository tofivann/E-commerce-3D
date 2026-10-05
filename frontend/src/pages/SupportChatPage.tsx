import React from "react";
import { ChatPanel } from "../components/chat/ChatPanel";
import { AppLayout } from "../components/layout/AppLayout";

interface SupportChatPageProps {
  isStaff?: boolean;
  isSubscribed?: boolean;
  onLogoutClick: () => void;
}

export const SupportChatPage: React.FC<SupportChatPageProps> = ({
  isStaff = false,
  isSubscribed = false,
  onLogoutClick,
}) => (
  // Misma regla de acceso que en HomePage: admins o suscriptores activos.
  <AppLayout isStaff={isStaff} hasAccess={isStaff || isSubscribed} onLogout={onLogoutClick}>
    <ChatPanel isAdmin={isStaff} />
  </AppLayout>
);
