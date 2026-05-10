/** Rôle global d'un utilisateur sur la plateforme. */
export type UserRole = 'standard' | 'provider' | 'admin';

/** Action d'administration enregistrée (audit trail). */
export type AdminActionType =
  | 'approve_provider'
  | 'reject_provider'
  | 'suspend_provider'
  | 'restore_provider'
  | 'delete_user'
  | 'send_warning';

export interface AdminAction {
  id: string;
  adminId: string;
  adminName: string;
  actionType: AdminActionType;
  targetId: string; // userId ou providerId concerné
  targetName: string;
  note?: string;
  createdAt: string;
}

/** Statistiques globales de la plateforme (pour le dashboard admin). */
export interface PlatformStats {
  totalUsers: number;
  totalProviders: number;
  pendingProviders: number;
  totalEvents: number;
  totalConversations: number;
  newUsersThisMonth: number;
}
