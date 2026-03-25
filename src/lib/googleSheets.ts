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
// SCHEMA
// userId is stored as the FIRST column in every sheet so that
// multiple users can share one Google Spreadsheet safely.
// Each backup replaces only the calling user's rows.
// ═══════════════════════════════════════════════════════════════

interface BackupData {
  accounts: any[];
  categories: any[];
  transactions: any[];
  filterPresets: any[];
}

const SHEETS_CONFIG = [
  {
    name: 'accounts',
    // userId comes first; the rest are the actual data fields
    headers: ['userId', 'id', 'name', 'type', 'balance', 'thresholdValue', 'color', 'icon', 'group', 'includeInNetWorth', 'isLiability', 'createdAt', 'updatedAt'],
  },
  {
    name: 'categories',
    headers: ['userId', 'id', 'name', 'type', 'parentId', 'icon', 'color', 'sortOrder', 'createdAt', 'updatedAt'],
  },
  {
    name: 'transactions',
    headers: ['userId', 'id', 'date', 'amount', 'transactionType', 'fromAccountId', 'toAccountId', 'categoryId', 'subCategoryId', 'description', 'notes', 'status', 'source', 'currency', 'linkedTransactionId', 'createdAt', 'updatedAt', 'categoryName', 'subCategoryName'],
  },
  {
    name: 'filterPresets',
    headers: ['userId', 'id', 'name', 'searchText', 'accountId', 'transactionType', 'categoryId', 'subCategoryId', 'dateOffsetType', 'dateOffsetStart', 'dateOffsetEnd', 'amountMin', 'amountMax', 'createdAt'],
  },
] as const;

// Human-readable labels for the header row (row 1) of each sheet.
// These are purely for display — restore logic uses SHEETS_CONFIG headers, not row 1.
const DISPLAY_HEADERS: Record<string, string> = {
  userId:              'User ID',
  id:                  'ID',
  name:                'Name',
  type:                'Type',
  balance:             'Balance',
  thresholdValue:      'Threshold Value',
  color:               'Color',
  icon:                'Icon',
  group:               'Group',
  includeInNetWorth:   'Include In Net Worth',
  isLiability:         'Is Liability',
  parentId:            'Parent ID',
  sortOrder:           'Sort Order',
  createdAt:           'Created At',
  updatedAt:           'Updated At',
  date:                'Date',
  amount:              'Amount',
  transactionType:     'Transaction Type',
  fromAccountId:       'From Account ID',
  toAccountId:         'To Account ID',
  categoryId:          'Category ID',
  subCategoryId:       'SubCategory ID',
  description:         'Note',
  notes:               'Description',
  status:              'Status',
  source:              'Source',
  currency:            'Currency',
  linkedTransactionId: 'Linked Transaction ID',
  categoryName:        'Category Name',
  subCategoryName:     'SubCategory Name',
  searchText:          'Search Text',
  accountId:           'Account ID',
  transactionType:     'Transaction Type',
  dateOffsetType:      'Date Offset Type',
  dateOffsetStart:     'Date Offset Start',
  dateOffsetEnd:       'Date Offset End',
  amountMin:           'Amount Min',
  amountMax:           'Amount Max',
};

/** Write human-readable column labels to row 1 of a sheet. */
async function writeHeaderRow(sheetName: string, headers: readonly string[]): Promise<void> {
  const labels = headers.map((h) => DISPLAY_HEADERS[h] ?? h);
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [labels] },
    });
  } catch (error: any) {
    if (!error.message?.includes('Unable to parse range')) throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/** Read every data row from a sheet (skips the header row A1). */
async function readAllRows(sheetName: string): Promise<string[][]> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A2:Z`,
    });
    return (response.data.values || []) as string[][];
  } catch (error: any) {
    if (error.message?.includes('Unable to parse range')) return [];
    throw error;
  }
}

/** Overwrite all data rows in a sheet (A2 onward) with the provided rows. */
async function writeAllRows(sheetName: string, rows: string[][]): Promise<void> {
  // Clear existing data rows first
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A2:Z`,
    });
  } catch (error: any) {
    if (!error.message?.includes('Unable to parse range')) throw error;
  }

  if (rows.length === 0) return;

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A2`,
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });
  } catch (error: any) {
    if (error.message?.includes('Unable to parse range')) {
      throw new Error(
        `Sheet "${sheetName}" does not exist. Please create sheets named: accounts, categories, transactions`
      );
    }
    throw error;
  }
}

/** Serialize a data object into a string row, with userId prepended as col 0. */
function serializeRow(item: any, headers: readonly string[], userId: string): string[] {
  return headers.map((header) => {
    if (header === 'userId') return userId;
    const value = item[header];
    if (value === undefined || value === null) return '';
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    return String(value);
  });
}

/** Deserialize a raw sheet row back to a data object, stripping the userId column. */
function deserializeRow(row: string[], headers: readonly string[]): Record<string, any> {
  const obj: Record<string, any> = {};
  headers.forEach((header, index) => {
    if (header === 'userId') return; // strip — callers never see it

    let value: any = row[index] ?? '';

    if (value === 'TRUE') value = true;
    else if (value === 'FALSE') value = false;
    else if (['balance', 'amount', 'thresholdValue', 'sortOrder'].includes(header)) {
      value = parseFloat(value) || 0;
    } else if (['amountMin', 'amountMax'].includes(header)) {
      value = value ? parseFloat(value) : undefined;
    } else if (header === 'id' || header.endsWith('Id')) {
      value = value ? parseInt(value) : undefined;
    } else if (['includeInNetWorth', 'isLiability'].includes(header)) {
      if (value === '') {
        // Blank cell: use safe defaults — include in net worth by default, not a liability
        value = header === 'includeInNetWorth' ? true : false;
      } else {
        value = value === 'TRUE' || value === true;
      }
    }

    // Preserve falsy-but-valid values (0, false); treat only '' / null / undefined as absent
    obj[header] = (value === '' || value === null || value === undefined) ? undefined : value;
  });
  return obj;
}

// ═══════════════════════════════════════════════════════════════
// BACKUP — writes only the calling user's rows.
// Other users' rows in the same sheet are preserved untouched.
// ═══════════════════════════════════════════════════════════════

export async function backupToSheets(data: BackupData, userId: string): Promise<void> {
  for (const config of SHEETS_CONFIG) {
    const sheetData = (data as any)[config.name] as any[];

    // 1. Read ALL existing rows (from all users)
    const allRows = await readAllRows(config.name);

    // 2. Keep rows that belong to OTHER users (col 0 = userId)
    const otherUsersRows = allRows.filter((row) => row[0] !== userId);

    // 3. Serialize this user's latest data (userId prepended)
    // For transactions, enrich with human-readable category/subcategory names
    let enrichedData = sheetData;
    if (config.name === 'transactions') {
      const categoryMap = new Map<number, string>();
      (data.categories as any[]).forEach((cat: any) => {
        if (cat.id != null) categoryMap.set(cat.id, cat.name);
      });
      enrichedData = sheetData.map((item: any) => ({
        ...item,
        categoryName: item.categoryId != null ? (categoryMap.get(item.categoryId) ?? '') : '',
        subCategoryName: item.subCategoryId != null ? (categoryMap.get(item.subCategoryId) ?? '') : '',
      }));
    }
    const thisUserRows = enrichedData.map((item) =>
      serializeRow(item, config.headers, userId)
    );

    // 4. Write header row (row 1) with human-readable labels, then data from row 2
    await writeHeaderRow(config.name, config.headers);
    await writeAllRows(config.name, [...otherUsersRows, ...thisUserRows]);
  }
}

// ═══════════════════════════════════════════════════════════════
// RESTORE — reads ONLY the calling user's rows.
// ═══════════════════════════════════════════════════════════════

export async function restoreFromSheets(userIdCandidates: string[]): Promise<BackupData> {
  const result: BackupData = { accounts: [], categories: [], transactions: [], filterPresets: [] };

  for (const config of SHEETS_CONFIG) {
    const allRows = await readAllRows(config.name);

    // Try each candidate userId in order until we find matching rows.
    // This handles cases where backups were created under a different userId
    // format (e.g. Google sub vs email vs legacy value).
    let userRows: Record<string, any>[] = [];
    for (const candidate of userIdCandidates) {
      const matched = allRows.filter((row) => row[0] === candidate);
      if (matched.length > 0) {
        userRows = matched.map((row) => deserializeRow(row, config.headers));
        break;
      }
    }

    // Last-resort: if still no match and only one unique user exists in the
    // sheet (personal spreadsheet), use all rows — it must be this user.
    if (userRows.length === 0 && allRows.length > 0) {
      const uniqueUsers = new Set(allRows.map((row) => row[0]).filter(Boolean));
      if (uniqueUsers.size === 1) {
        userRows = allRows.map((row) => deserializeRow(row, config.headers));
      }
    }

    (result as any)[config.name] = userRows;
  }

  return result;
}

export const sheetsClient = {
  backupToSheets,
  restoreFromSheets,
};
