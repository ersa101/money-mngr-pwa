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
  // Case 2: real newlines already present
  if (raw.includes('\n')) {
    const key = raw.replace(/\r\n/g, '\n').trim();
    return { key, format: 'real-newlines' };
  }
  // Case 3: base64-encoded key
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf-8');
    if (decoded.includes('PRIVATE KEY')) {
      return { key: decoded.replace(/\r\n/g, '\n').trim(), format: 'base64' };
    }
  } catch {}

  return { key: raw.trim(), format: 'single-line' };
}

// Lazy-init so credentials are resolved at request time, not at module-load time.
let _sheets: ReturnType<typeof google.sheets> | null = null;
export let _keyDiag: { credSource: string; format?: string; hasEmail: boolean; hasSpreadsheetId: boolean } | null = null;

function getCredentials(): { credentials: any; credSource: string; keyFormat?: string } {
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
  budgets: any[];
  goals: any[];
  lifeEvents: any[];
  feedbackLog: any[];
  appSettings: any[];
  computedInsights: any[];
  categoryBuckets: any[];
}

const SHEETS_CONFIG = [
  {
    name: 'accounts',
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
  {
    name: 'budgets',
    headers: ['userId', 'id', 'categoryId', 'categoryName', 'monthlyLimit', 'createdAt', 'updatedAt'],
  },
  {
    name: 'goals',
    headers: ['userId', 'id', 'name', 'targetAmount', 'currentAmount', 'suggestedByAI', 'createdAt', 'status'],
  },
  {
    name: 'lifeEvents',
    headers: ['userId', 'id', 'detectedMonth', 'eventType', 'aiSummary', 'confirmedByUser', 'createdAt'],
  },
  {
    name: 'appSettings',
    headers: ['userId', 'key', 'value'],
  },
  {
    name: 'categoryBuckets',
    headers: ['userId', 'id', 'categoryId', 'categoryName', 'bucketName'],
  },
  {
    name: 'feedbackLog',
    headers: ['userId', 'id', 'timestamp', 'featureId', 'insightType', 'insightSummary', 'userResponse', 'userReason', 'categoryContext', 'subcategoryContext', 'monthYear', 'syncedToSheet'],
  },
  {
    name: 'computedInsights',
    headers: ['userId', 'id', 'key', 'value', 'computedAt', 'version'],
  },
] as const;

// Human-readable labels for the header row (row 1) of each sheet.
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
  dateOffsetType:      'Date Offset Type',
  dateOffsetStart:     'Date Offset Start',
  dateOffsetEnd:       'Date Offset End',
  amountMin:           'Amount Min',
  amountMax:           'Amount Max',
  monthlyLimit:        'Monthly Limit',
  targetAmount:        'Target Amount',
  currentAmount:       'Current Amount',
  suggestedByAI:       'Suggested By AI',
  detectedMonth:       'Detected Month',
  eventType:           'Event Type',
  aiSummary:           'AI Summary',
  confirmedByUser:     'Confirmed By User',
  timestamp:           'Timestamp',
  featureId:           'Feature ID',
  insightType:         'Insight Type',
  insightSummary:      'Insight Summary',
  userResponse:        'User Response',
  userReason:          'User Reason',
  categoryContext:     'Category Context',
  subcategoryContext:  'Subcategory Context',
  monthYear:           'Month Year',
  syncedToSheet:       'Synced To Sheet',
  key:                 'Key',
  value:               'Value',
  computedAt:          'Computed At',
  version:             'Version',
  bucketName:          'Bucket Name',
};

/** Ensure all required sheets exist, creating any missing ones in a single batchUpdate. */
async function ensureSheetsExist(sheetNames: string[]): Promise<void> {
  const spreadsheetId = getSpreadsheetId();
  const meta = await getSheetsClient().spreadsheets.get({ spreadsheetId });
  const existing = new Set(
    (meta.data.sheets ?? []).map((s: any) => s.properties?.title).filter(Boolean)
  );

  const missing = sheetNames.filter((name) => !existing.has(name));
  if (missing.length === 0) return;

  await getSheetsClient().spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
    },
  });

  // Write header rows for each newly created sheet
  const configMap = new Map<string, readonly string[]>(SHEETS_CONFIG.map((c) => [c.name, c.headers]));
  for (const name of missing) {
    const headers = configMap.get(name);
    if (headers) await writeHeaderRow(name, headers);
  }
}

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
    throw error;
  }
}

const DATE_FIELDS = new Set(['createdAt', 'updatedAt', 'date', 'detectedMonth', 'computedAt', 'timestamp']);

/** Serialize a data object into a string row, with userId prepended as col 0. */
function serializeRow(item: any, headers: readonly string[], userId: string): string[] {
  return headers.map((header) => {
    if (header === 'userId') return userId;
    const value = item[header];
    if (value === undefined || value === null) return '';
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (DATE_FIELDS.has(header) && typeof value === 'number') return new Date(value).toISOString();
    return String(value);
  });
}

/** Deserialize a raw sheet row back to a data object, stripping the userId column. */
function deserializeRow(row: string[], headers: readonly string[]): Record<string, any> {
  const obj: Record<string, any> = {};
  headers.forEach((header, index) => {
    if (header === 'userId') return;

    let value: any = row[index] ?? '';

    if (value === 'TRUE') value = true;
    else if (value === 'FALSE') value = false;
    else if (['balance', 'amount', 'thresholdValue', 'sortOrder', 'monthlyLimit', 'targetAmount', 'currentAmount', 'version'].includes(header)) {
      value = parseFloat(value) || 0;
    } else if (['amountMin', 'amountMax'].includes(header)) {
      value = value ? parseFloat(value) : undefined;
    } else if (header === 'id' || header.endsWith('Id')) {
      value = value ? parseInt(value) : undefined;
    } else if (['includeInNetWorth', 'isLiability'].includes(header)) {
      if (value === '') {
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
  await ensureSheetsExist(SHEETS_CONFIG.map((s) => s.name));
  for (const config of SHEETS_CONFIG) {
    const sheetData = (data as any)[config.name] as any[];

    // 1. Read ALL existing rows (from all users)
    const allRows = await readAllRows(config.name);

    // 2. Keep rows that belong to OTHER users (col 0 = userId)
    const otherUsersRows = allRows.filter((row) => row[0] !== userId);

    // 3. Serialize this user's latest data
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
  const result: BackupData = {
    accounts: [], categories: [], transactions: [], filterPresets: [],
    budgets: [], goals: [], lifeEvents: [], feedbackLog: [],
    appSettings: [], computedInsights: [], categoryBuckets: [],
  };
  const diag: Record<string, any> = { userIdCandidates, sheets: {} };

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

// ═══════════════════════════════════════════════════════════════
// FAIN FEEDBACK — appends a single row to the FAIN_Feedback_Log sheet.
// ═══════════════════════════════════════════════════════════════

const FEEDBACK_SHEET_NAME = 'FAIN_Feedback_Log';
const FEEDBACK_HEADERS = [
  'timestamp', 'feature_id', 'insight_type', 'insight_summary',
  'user_response', 'user_reason', 'category_context', 'subcategory_context', 'month_year',
];

export async function appendFeedbackRow(row: string[]): Promise<void> {
  try {
    const existing = await getSheetsClient().spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: `${FEEDBACK_SHEET_NAME}!A1:A1`,
    });
    if (!existing.data.values?.length) {
      await getSheetsClient().spreadsheets.values.update({
        spreadsheetId: getSpreadsheetId(),
        range: `${FEEDBACK_SHEET_NAME}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [FEEDBACK_HEADERS] },
      });
    }
  } catch (e: any) {
    // Sheet may not exist — silently skip header
  }

  await getSheetsClient().spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: `${FEEDBACK_SHEET_NAME}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

// ═══════════════════════════════════════════════════════════════
// SYNC — per-user tabs named by Google email (Phase 1.5)
// Transactions: tab named exactly as user email
// Accounts:     tab named "[email]_accounts"
// Categories:   tab named "[email]_categories"
// ═══════════════════════════════════════════════════════════════

const SYNC_TX_HEADERS = [
  'id', 'transactionType', 'amount', 'categoryId', 'subCategoryId',
  'fromAccountId', 'toAccountId', 'date', 'description', 'updatedAt',
  'notes', 'status', 'source', 'currency', 'linkedTransactionId', 'createdAt',
] as const;

const SYNC_ACCT_HEADERS = [
  'id', 'name', 'type', 'balance', 'thresholdValue',
  'color', 'icon', 'group', 'includeInNetWorth', 'isLiability',
  'updatedAt', 'createdAt',
] as const;

const SYNC_CAT_HEADERS = [
  'id', 'name', 'type', 'parentId', 'icon', 'color', 'sortOrder',
  'updatedAt', 'createdAt',
] as const;

/** Serialize a sync record to a row, converting numbers/booleans to strings. */
function serializeSyncRow(item: any, headers: readonly string[]): string[] {
  return headers.map((h) => {
    const v = item[h];
    if (v === undefined || v === null) return '';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    return String(v);
  });
}

/** Deserialize a sync row back to a plain object. */
function deserializeSyncRow(
  row: string[],
  headers: readonly string[],
): Record<string, any> {
  const obj: Record<string, any> = {};
  headers.forEach((h, i) => {
    let v: any = row[i] ?? '';
    if (v === '') { obj[h] = undefined; return; }
    if (v === 'TRUE') v = true;
    else if (v === 'FALSE') v = false;
    else if (['id', 'categoryId', 'subCategoryId', 'fromAccountId', 'toAccountId',
              'linkedTransactionId', 'parentId', 'sortOrder'].includes(h)) {
      v = v ? parseInt(v, 10) : undefined;
      if (isNaN(v as number)) v = undefined;
    } else if (['amount', 'balance', 'thresholdValue'].includes(h)) {
      v = parseFloat(v) || 0;
    } else if (h === 'updatedAt') {
      // stored as unix ms number string
      const n = parseInt(v, 10);
      v = isNaN(n) ? undefined : n;
    }
    obj[h] = v;
  });
  return obj;
}

export interface SyncData {
  transactions: any[];
  accounts: any[];
  categories: any[];
}

/** Write the full user dataset to their named sheet tabs (overwrites previous data). */
export async function pushSyncData(email: string, data: SyncData): Promise<void> {
  const tabs = [
    { name: email,                headers: SYNC_TX_HEADERS,   rows: data.transactions },
    { name: `${email}_accounts`,  headers: SYNC_ACCT_HEADERS, rows: data.accounts },
    { name: `${email}_categories`,headers: SYNC_CAT_HEADERS,  rows: data.categories },
  ];

  for (const tab of tabs) {
    // Write header row
    try {
      await getSheetsClient().spreadsheets.values.update({
        spreadsheetId: getSpreadsheetId(),
        range: `${tab.name}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [tab.headers as unknown as string[]] },
      });
    } catch (e: any) {
      if (e.message?.includes('Unable to parse range')) {
        throw new Error(
          `Sheet tab "${tab.name}" does not exist. Create it in your Google Spreadsheet first.`,
        );
      }
      throw e;
    }

    // Clear existing data rows then write fresh
    try {
      await getSheetsClient().spreadsheets.values.clear({
        spreadsheetId: getSpreadsheetId(),
        range: `${tab.name}!A2:Z`,
      });
    } catch (_) { /* ignore if empty */ }

    if (tab.rows.length === 0) continue;

    await getSheetsClient().spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId(),
      range: `${tab.name}!A2`,
      valueInputOption: 'RAW',
      requestBody: { values: tab.rows.map((r) => serializeSyncRow(r, tab.headers)) },
    });
  }
}

/** Read the user's named sheet tabs and return typed arrays. */
export async function pullSyncData(email: string): Promise<SyncData> {
  const readTab = async (name: string): Promise<string[][]> => {
    try {
      const res = await getSheetsClient().spreadsheets.values.get({
        spreadsheetId: getSpreadsheetId(),
        range: `${name}!A2:Z`,
      });
      return (res.data.values || []) as string[][];
    } catch (e: any) {
      if (e.message?.includes('Unable to parse range')) return [];
      throw e;
    }
  };

  const [txRows, acctRows, catRows] = await Promise.all([
    readTab(email),
    readTab(`${email}_accounts`),
    readTab(`${email}_categories`),
  ]);

  return {
    transactions: txRows.map((r) => deserializeSyncRow(r, SYNC_TX_HEADERS)),
    accounts:     acctRows.map((r) => deserializeSyncRow(r, SYNC_ACCT_HEADERS)),
    categories:   catRows.map((r) => deserializeSyncRow(r, SYNC_CAT_HEADERS)),
  };
}

export const sheetsClient = {
  backupToSheets,
  restoreFromSheets,
  appendFeedbackRow,
  pushSyncData,
  pullSyncData,
};
