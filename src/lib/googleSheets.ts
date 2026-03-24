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
    headers: ['userId', 'id', 'date', 'amount', 'transactionType', 'fromAccountId', 'toAccountId', 'categoryId', 'subCategoryId', 'description', 'notes', 'status', 'source', 'currency', 'linkedTransactionId', 'createdAt', 'updatedAt'],
  },
] as const;

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
    } else if (header === 'id' || header.endsWith('Id')) {
      value = value ? parseInt(value) : undefined;
    } else if (['includeInNetWorth', 'isLiability'].includes(header)) {
      value = value === 'TRUE' || value === true;
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
    const thisUserRows = sheetData.map((item) =>
      serializeRow(item, config.headers, userId)
    );

    // 4. Write: preserve other users first, then this user's fresh data
    await writeAllRows(config.name, [...otherUsersRows, ...thisUserRows]);
  }
}

// ═══════════════════════════════════════════════════════════════
// RESTORE — reads ONLY the calling user's rows.
// ═══════════════════════════════════════════════════════════════

export async function restoreFromSheets(userId: string): Promise<BackupData> {
  const result: BackupData = { accounts: [], categories: [], transactions: [] };

  for (const config of SHEETS_CONFIG) {
    const allRows = await readAllRows(config.name);

    // Filter to this user's rows only, then strip the userId column
    const userRows = allRows
      .filter((row) => row[0] === userId)
      .map((row) => deserializeRow(row, config.headers));

    (result as any)[config.name] = userRows;
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// FAIN FEEDBACK — appends a single row to the FAIN_Feedback_Log sheet.
// The sheet is created automatically if it doesn't exist (first row write).
// ═══════════════════════════════════════════════════════════════

const FEEDBACK_SHEET_NAME = 'FAIN_Feedback_Log';
const FEEDBACK_HEADERS = [
  'timestamp', 'feature_id', 'insight_type', 'insight_summary',
  'user_response', 'user_reason', 'category_context', 'subcategory_context', 'month_year',
];

export async function appendFeedbackRow(row: string[]): Promise<void> {
  // Ensure header row exists on first write
  try {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${FEEDBACK_SHEET_NAME}!A1:A1`,
    });
    if (!existing.data.values?.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${FEEDBACK_SHEET_NAME}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [FEEDBACK_HEADERS] },
      });
    }
  } catch (e: any) {
    // Sheet may not exist — silently skip header
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${FEEDBACK_SHEET_NAME}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

export const sheetsClient = {
  backupToSheets,
  restoreFromSheets,
  appendFeedbackRow,
};
