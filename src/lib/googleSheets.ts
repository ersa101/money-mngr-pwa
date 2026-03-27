import { google } from 'googleapis';

// Resolved at request time (inside getSheetsClient) — not at module load
function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SPREADSHEET_ID;
  if (!id) throw new Error('GOOGLE_SPREADSHEET_ID is not set');
  return id;
}

function resolvePrivateKey(): { key: string; format: string } {
  const raw = process.env.GOOGLE_PRIVATE_KEY ?? '';
  if (!raw) return { key: '', format: 'missing' };

  // Case 1: escaped \n sequences (most env dashboards: Vercel, Railway, etc.)
  if (raw.includes('\\n')) {
    const key = raw.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();
    return { key, format: 'escaped-newlines' };
  }
  // Case 2: real newlines already present (some platforms inject them directly)
  if (raw.includes('\n')) {
    const key = raw.replace(/\r\n/g, '\n').trim();
    return { key, format: 'real-newlines' };
  }
  // Case 3: base64-encoded key (some hosting providers base64-encode secrets)
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf-8');
    if (decoded.includes('PRIVATE KEY')) {
      return { key: decoded.replace(/\r\n/g, '\n').trim(), format: 'base64' };
    }
  } catch {}

  // Case 4: single-line with no separators — may still work or surface a better error
  return { key: raw.trim(), format: 'single-line' };
}

// Lazy-init so credentials are resolved at request time, not at module-load time.
let _sheets: ReturnType<typeof google.sheets> | null = null;
export let _keyDiag: { credSource: string; format?: string; hasEmail: boolean; hasSpreadsheetId: boolean } | null = null;

function getCredentials(): { credentials: any; credSource: string; keyFormat?: string } {
  // Option A: Full service account JSON as base64 (preferred — no OpenSSL key parsing at all)
  // Set GOOGLE_SERVICE_ACCOUNT_JSON in Vercel = base64 of your service account .json file
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (b64) {
    try {
      const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
      if (json.client_email && json.private_key) {
        return { credentials: json, credSource: 'json-base64' };
      }
    } catch {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is set but could not be decoded — ensure it is valid base64 JSON');
    }
  }

  // Option B: Individual env vars (fallback — subject to OpenSSL 3 key parsing)
  const { key, format } = resolvePrivateKey();
  if (!key) throw new Error(`GOOGLE_PRIVATE_KEY is not set (detected format: ${format})`);
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL is not set');
  return {
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: key,
    },
    credSource: 'individual-env-vars',
    keyFormat: format,
  };
}

function getSheetsClient() {
  if (_sheets) return _sheets;

  if (!process.env.GOOGLE_SPREADSHEET_ID) throw new Error('GOOGLE_SPREADSHEET_ID is not set');

  const { credentials, credSource, keyFormat } = getCredentials();
  _keyDiag = {
    credSource,
    format: keyFormat,
    hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    hasSpreadsheetId: !!process.env.GOOGLE_SPREADSHEET_ID,
  };

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  _sheets = google.sheets({ version: 'v4', auth });
  return _sheets;
}

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
    await getSheetsClient().spreadsheets.values.update({
      spreadsheetId: getSpreadsheetId(),
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
    const response = await getSheetsClient().spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
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
    await getSheetsClient().spreadsheets.values.clear({
      spreadsheetId: getSpreadsheetId(),
      range: `${sheetName}!A2:Z`,
    });
  } catch (error: any) {
    if (!error.message?.includes('Unable to parse range')) throw error;
  }

  if (rows.length === 0) return;

  try {
    await getSheetsClient().spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId(),
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

export async function restoreFromSheets(
  userIdCandidates: string[]
): Promise<BackupData & { _diag: Record<string, any> }> {
  const result: BackupData = { accounts: [], categories: [], transactions: [], filterPresets: [] };
  const diag: Record<string, any> = { userIdCandidates, sheets: {} };

  // Validate client init (surfaces key/env errors early with a clear message)
  let stage = 'init';
  try {
    getSheetsClient();
    getSpreadsheetId();
  } catch (err: any) {
    throw new Error(`[stage:${stage}] ${err.message}`);
  }

  for (const config of SHEETS_CONFIG) {
    stage = `read:${config.name}`;
    const allRows = await readAllRows(config.name);
    const uniqueUsersInSheet = [...new Set(allRows.map((row) => row[0]).filter(Boolean))];

    let matchedBy: string | null = null;
    let userRows: Record<string, any>[] = [];
    for (const candidate of userIdCandidates) {
      const matched = allRows.filter((row) => row[0] === candidate);
      if (matched.length > 0) {
        userRows = matched.map((row) => deserializeRow(row, config.headers));
        matchedBy = candidate;
        break;
      }
    }

    // Last-resort: single user in sheet — must be this user
    if (userRows.length === 0 && allRows.length > 0) {
      if (uniqueUsersInSheet.length === 1) {
        userRows = allRows.map((row) => deserializeRow(row, config.headers));
        matchedBy = `fallback:${uniqueUsersInSheet[0]}`;
      }
    }

    diag.sheets[config.name] = {
      totalRows: allRows.length,
      uniqueUsers: uniqueUsersInSheet,
      matchedBy,
      matchedRows: userRows.length,
    };

    (result as any)[config.name] = userRows;
  }

  return { ...result, _diag: diag };
}

export const sheetsClient = {
  backupToSheets,
  restoreFromSheets,
};
