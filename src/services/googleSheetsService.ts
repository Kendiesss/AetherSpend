/**
 * CyberSpend Google Sheets & Drive API Integration Service
 */
import { Transaction } from '../types';

export const SHEET_HEADERS = [
  'Record ID',
  'Date / Timestamp',
  'Merchant / Entity',
  'Amount (Assets Out)',
  'Category / Sector',
  'Document Type',
  'Verification Status',
  'Archived At'
];

/**
 * Extract clean spreadsheet ID from URL or raw ID
 */
export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Helper to check response or throw helpful errors
 */
async function handleApiResponse(res: Response, contextMessage: string) {
  if (!res.ok) {
    let errorDetail = '';
    try {
      const errJson = await res.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = res.statusText;
    }

    if (res.status === 401) {
      throw new Error(`AUTH_EXPIRED: Access token expired or invalid. Please re-authenticate with Google. (${errorDetail})`);
    }
    if (res.status === 404) {
      throw new Error(`NOT_FOUND: Spreadsheet not found. Check the ID and make sure you have access. (${errorDetail})`);
    }
    if (res.status === 403) {
      throw new Error(`PERMISSION_DENIED: Access denied. Make sure the spreadsheet is shared with your account. (${errorDetail})`);
    }

    throw new Error(`${contextMessage}: ${errorDetail}`);
  }
  return res.json();
}

/**
 * Fetch spreadsheet metadata (title and sheet tabs)
 */
export async function getSpreadsheetInfo(token: string, spreadsheetId: string): Promise<{ title: string; tabs: string[]; url: string }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=properties.title,sheets.properties.title`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await handleApiResponse(res, 'Failed to fetch spreadsheet details');
  const title = data.properties?.title || 'Untitled Spreadsheet';
  const tabs = (data.sheets || []).map((s: any) => s.properties?.title).filter(Boolean);

  return {
    title,
    tabs,
    url: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`
  };
}

/**
 * Automatically create a brand new CyberSpend Spreadsheet with dedicated tabs for all document types
 */
export async function createCyberSpendSpreadsheet(
  token: string,
  documentTypes: string[],
  customTitle: string = 'CyberSpend Financial Archive'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; spreadsheetName: string; tabs: string[] }> {
  const sheetsPayload = documentTypes.map(type => ({
    properties: {
      title: type
    }
  }));

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: customTitle
      },
      sheets: sheetsPayload.length > 0 ? sheetsPayload : [{ properties: { title: 'General Receipts' } }]
    })
  });

  const createdData = await handleApiResponse(createRes, 'Failed to create CyberSpend spreadsheet');
  const spreadsheetId = createdData.spreadsheetId;
  const spreadsheetUrl = createdData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const spreadsheetName = createdData.properties?.title || customTitle;
  const tabs = (createdData.sheets || []).map((s: any) => s.properties?.title);

  // Initialize header rows for all created tabs
  for (const tab of tabs) {
    try {
      await initializeTabHeaders(token, spreadsheetId, tab);
    } catch (e) {
      console.warn(`Could not set header for tab "${tab}":`, e);
    }
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    spreadsheetName,
    tabs
  };
}

/**
 * Initialize column headers in a specific tab
 */
export async function initializeTabHeaders(token: string, spreadsheetId: string, tabName: string) {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const safeRange = `'${tabName.replace(/'/g, "''")}'!A1:H1`;
  const encodedRange = encodeURIComponent(safeRange);
  
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodedRange}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [SHEET_HEADERS]
    })
  });
}

/**
 * Ensure a specific document type tab exists in the Google Sheet, creating it if missing
 */
export async function ensureSheetTabExists(token: string, spreadsheetId: string, tabName: string): Promise<boolean> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const info = await getSpreadsheetInfo(token, cleanId);
  
  // Tab already exists
  if (info.tabs.includes(tabName)) {
    return true;
  }

  // Create new tab via batchUpdate
  const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: tabName
            }
          }
        }
      ]
    })
  });

  await handleApiResponse(batchRes, `Failed to create tab "${tabName}" in Google Sheet`);
  
  // Write header row to the newly created tab
  await initializeTabHeaders(token, cleanId, tabName);
  return true;
}

/**
 * Format a Transaction row for Google Sheets
 */
function formatTransactionRow(tx: Transaction, documentType: string): any[] {
  const formattedDate = tx.date ? new Date(tx.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }) : '';

  return [
    tx.id,
    formattedDate,
    tx.merchant,
    tx.amount,
    tx.category,
    tx.documentType || documentType,
    'Verified (AI Protocol)',
    tx.createdAt ? new Date(tx.createdAt).toLocaleString() : new Date().toLocaleString()
  ];
}

/**
 * Append a single transaction to the designated sheet tab
 */
export async function appendTransactionToSheet(
  token: string,
  spreadsheetId: string,
  tabName: string,
  transaction: Transaction
): Promise<{ success: boolean; updatedRange?: string }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  
  // Make sure tab exists with headers
  await ensureSheetTabExists(token, cleanId, tabName);

  const safeRange = `'${tabName.replace(/'/g, "''")}'!A:H`;
  const encodedRange = encodeURIComponent(safeRange);
  const rowValues = [formatTransactionRow(transaction, tabName)];

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: rowValues
      })
    }
  );

  const resData = await handleApiResponse(appendRes, `Failed to append receipt data to tab "${tabName}"`);
  return {
    success: true,
    updatedRange: resData.updates?.updatedRange
  };
}

/**
 * Batch sync all transactions organized by their document types
 */
export async function syncAllTransactionsToSheet(
  token: string,
  spreadsheetId: string,
  transactions: Transaction[],
  defaultDocType: string = 'General Expense',
  onProgress?: (completed: number, total: number) => void
): Promise<{ syncedCount: number; errors: string[] }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  
  // Group transactions by documentType
  const grouped: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    const type = tx.documentType || defaultDocType;
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(tx);
  }

  let completed = 0;
  const total = transactions.length;
  const errors: string[] = [];

  for (const [tabName, txList] of Object.entries(grouped)) {
    try {
      await ensureSheetTabExists(token, cleanId, tabName);
      const safeRange = `'${tabName.replace(/'/g, "''")}'!A:H`;
      const encodedRange = encodeURIComponent(safeRange);
      const rows = txList.map(tx => formatTransactionRow(tx, tabName));

      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: rows
          })
        }
      );

      await handleApiResponse(appendRes, `Failed to sync batch to "${tabName}"`);
      completed += txList.length;
      if (onProgress) onProgress(completed, total);
    } catch (err: any) {
      errors.push(`Tab "${tabName}": ${err.message}`);
    }
  }

  return {
    syncedCount: completed,
    errors
  };
}
