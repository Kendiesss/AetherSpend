/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Category = 'Groceries' | 'Dining' | 'Utilities' | 'Transport' | 'Health' | 'Shopping' | 'Entertainment' | 'Misc';

export const DEFAULT_DOCUMENT_TYPES = [
  'Official Receipt (OR)',
  'Sales Invoice (SI)',
  'Collection Receipt (CR)',
  'Billing Statement (BS)',
  'Delivery Receipt (DR)',
  'General Expense'
];

export interface Transaction {
  id: string;
  userId: string;
  merchant: string;
  amount: number;
  category: Category;
  documentType: string;
  date: string;
  imageUrl?: string;
  createdAt: string;
  syncedToSheets?: boolean;
  sheetRowIndex?: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: 'admin' | 'user';
  lastActive?: string;
  spreadsheetConfig?: SpreadsheetConfig;
  customDocumentTypes?: string[];
}

export interface ReceiptData {
  merchant: string;
  amount: number;
  category: Category;
  documentType: string;
  date: string;
}

export interface SpreadsheetConfig {
  spreadsheetId?: string;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
  autoSync: boolean;
  lastSyncedAt?: string;
  connectedEmail?: string;
}
