/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Category = 'Groceries' | 'Dining' | 'Utilities' | 'Transport' | 'Health' | 'Shopping' | 'Entertainment' | 'Misc';

export interface Transaction {
  id: string;
  userId: string;
  merchant: string;
  amount: number;
  category: Category;
  date: string;
  imageUrl?: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: 'admin' | 'user';
}

export interface ReceiptData {
  merchant: string;
  amount: number;
  category: Category;
  date: string;
}
