import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// ═══════════════════════════════════════════════════════════════
// BACKUP: Write all data to Google Sheets (batch)
// ═══════════════════════════════════════════════════════════════

interface BackupData {
  accounts: any[];
  categories: any[];
  transactions: any[];
}

export async function backupToSheets(data: BackupData): Promise<void> {
  // Define headers for each sheet (only core tables)
  const sheetsConfig = [
    {
      name: 'accounts',
      headers: ['id', 'name', 'type', 'balance', 'thresholdValue', 'color', 'icon', 'group', 'includeInNetWorth', 'isLiability', 'createdAt', 'updatedAt'],
      data: data.accounts,
    },
    {
      name: 'categories',
      headers: ['id', 'name', 'type', 'parentId', 'icon', 'color', 'sortOrder', 'createdAt', 'updatedAt'],
      data: data.categories,
    },
    {
      name: 'transactions',
      headers: ['id', 'date', 'amount', 'transactionType', 'fromAccountId', 'toAccountId', 'categoryId', 'subCategoryId', 'description', 'notes', 'status', 'source', 'currency', 'linkedTransactionId', 'createdAt', 'updatedAt'],
      data: data.transactions,
    },
  ];

  for (const config of sheetsConfig) {
    try {
      // Clear existing data (keep header)
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${config.name}!A2:Z`,
      });
    } catch (error: any) {
      // If sheet doesn't exist, try to create it or skip
      if (error.message?.includes('Unable to parse range')) {
        console.warn(`Sheet "${config.name}" not found, skipping clear operation`);
      } else {
        throw error;
      }
    }

    if (config.data.length === 0) continue;

    // Convert objects to rows
    const rows = config.data.map(item =>
      config.headers.map(header => {
        const value = item[header];
        if (value === undefined || value === null) return '';
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        return String(value);
      })
    );

    try {
      // Batch write all rows at once
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${config.name}!A2`,
        valueInputOption: 'RAW',
        requestBody: {
          values: rows,
        },
      });
    } catch (error: any) {
      if (error.message?.includes('Unable to parse range')) {
        throw new Error(`Sheet "${config.name}" does not exist in the Google Spreadsheet. Please create sheets named: accounts, categories, transactions`);
      }
      throw error;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// RESTORE: Read all data from Google Sheets
// ═══════════════════════════════════════════════════════════════

export async function restoreFromSheets(): Promise<BackupData> {
  const sheetsConfig = [
    { name: 'accounts', headers: ['id', 'name', 'type', 'balance', 'thresholdValue', 'color', 'icon', 'group', 'includeInNetWorth', 'isLiability', 'createdAt', 'updatedAt'] },
    { name: 'categories', headers: ['id', 'name', 'type', 'parentId', 'icon', 'color', 'sortOrder', 'createdAt', 'updatedAt'] },
    { name: 'transactions', headers: ['id', 'date', 'amount', 'transactionType', 'fromAccountId', 'toAccountId', 'categoryId', 'subCategoryId', 'description', 'notes', 'status', 'source', 'currency', 'linkedTransactionId', 'createdAt', 'updatedAt'] },
  ];

  const result: BackupData = {
    accounts: [],
    categories: [],
    transactions: [],
  };

  for (const config of sheetsConfig) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${config.name}!A2:Z`,
      });

      const rows = response.data.values || [];

      const data = rows.map(row => {
        const obj: Record<string, any> = {};
        config.headers.forEach((header, index) => {
          let value = row[index];

          // Parse types
          if (value === 'TRUE') value = true;
          else if (value === 'FALSE') value = false;
          else if (header === 'balance' || header === 'amount' || header === 'thresholdValue' || header === 'sortOrder') {
            value = parseFloat(value) || 0;
          }
          else if (header === 'id' || header.endsWith('Id')) {
            value = value ? parseInt(value) : undefined;
          }
          else if (header === 'includeInNetWorth' || header === 'isLiability') {
            value = value === 'TRUE' || value === true;
          }

          obj[header] = value || undefined;
        });
        return obj;
      });

      (result as any)[config.name] = data;
    } catch (error: any) {
      if (error.message?.includes('Unable to parse range')) {
        console.warn(`Sheet "${config.name}" not found, using empty array`);
        (result as any)[config.name] = [];
      } else {
        throw error;
      }
    }
  }

  return result;
}

export const sheetsClient = {
  backupToSheets,
  restoreFromSheets,
};
