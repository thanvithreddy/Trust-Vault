export type Role = 'ROLE_ADMIN' | 'ROLE_OWNER' | 'ROLE_VIEWER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  token?: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  description: string;
  category: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  checksumSha256: string;
  ownerEmail: string;
  ownerFullName: string;
  createdAt: string;
  updatedAt: string;
  userPermissionLevel: 'OWNER' | 'EDIT' | 'READ' | 'NONE';
}

export interface DocumentPermission {
  id: string;
  userEmail: string;
  userFullName: string;
  permissionLevel: 'READ' | 'EDIT';
  grantedAt: string;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string | null;
  userEmail: string;
  userRole: string;
  action: string;
  documentId: string | null;
  documentTitle: string | null;
  status: 'SUCCESS' | 'DENIED' | 'ERROR';
  ipAddress: string;
  details: string;
  previousHash: string;
  currentHash: string;
}

export interface ChainVerificationResult {
  valid: boolean;
  totalRecords: number;
  corruptedRecordId: string | null;
  details: string;
}

export interface AISuggestion {
  suggestedUserEmail: string;
  suggestedUserName: string;
  suggestedPermission: 'READ' | 'EDIT';
  confidence: number;
  rationale: string;
}
