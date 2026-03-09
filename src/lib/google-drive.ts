import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

const ROOT_FOLDER_NAME = 'MoneyMngr_Snapshots';

/** Sanitize a userId for use as a Drive folder name. */
function sanitizeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Get (or create) the per-user subfolder inside the shared root folder.
 * Structure: MoneyMngr_Snapshots / user_<userId> /
 * This completely isolates each user's snapshots from each other.
 */
async function getSnapshotsFolderId(userId: string): Promise<string> {
  const safeUserId = sanitizeUserId(userId);

  // 1. Get or create the shared root folder
  let rootId: string;
  const rootResponse = await drive.files.list({
    q: `name='${ROOT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (rootResponse.data.files && rootResponse.data.files.length > 0) {
    rootId = rootResponse.data.files[0].id!;
  } else {
    const rootFolder = await drive.files.create({
      requestBody: { name: ROOT_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id',
    });
    rootId = rootFolder.data.id!;
  }

  // 2. Get or create the per-user subfolder inside root
  const userFolderName = `user_${safeUserId}`;
  const userResponse = await drive.files.list({
    q: `name='${userFolderName}' and '${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (userResponse.data.files && userResponse.data.files.length > 0) {
    return userResponse.data.files[0].id!;
  }

  const userFolder = await drive.files.create({
    requestBody: {
      name: userFolderName,
      parents: [rootId],
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  return userFolder.data.id!;
}

// ═══════════════════════════════════════════════════════════════
// CREATE SNAPSHOT
// ═══════════════════════════════════════════════════════════════

interface SnapshotData {
  accounts: any[];
  categories: any[];
  transactions: any[];
  accountTypes?: any[];
  accountGroups?: any[];
}

export async function createSnapshot(data: SnapshotData, userId: string): Promise<{
  id: string;
  name: string;
  createdAt: string;
}> {
  const folderId = await getSnapshotsFolderId(userId);
  const timestamp = new Date().toISOString();
  const fileName = `snapshot_${timestamp.replace(/[:.]/g, '-')}.json`;

  const snapshotContent = {
    version: '1.0',
    createdAt: timestamp,
    data,
    stats: {
      totalAccounts: data.accounts.length,
      totalCategories: data.categories.length,
      totalTransactions: data.transactions.length,
    },
  };

  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType: 'application/json',
    },
    media: {
      mimeType: 'application/json',
      body: JSON.stringify(snapshotContent, null, 2),
    },
    fields: 'id, name, createdTime',
  });

  return {
    id: file.data.id!,
    name: file.data.name!,
    createdAt: timestamp,
  };
}

// ═══════════════════════════════════════════════════════════════
// LIST SNAPSHOTS
// ═══════════════════════════════════════════════════════════════

export interface SnapshotInfo {
  id: string;
  name: string;
  createdAt: string;
  size: number;
}

export async function listSnapshots(userId: string): Promise<SnapshotInfo[]> {
  const folderId = await getSnapshotsFolderId(userId);

  const response = await drive.files.list({
    q: `'${folderId}' in parents and mimeType='application/json' and trashed=false`,
    fields: 'files(id, name, createdTime, size)',
    orderBy: 'createdTime desc',
  });

  return (response.data.files || []).map(file => ({
    id: file.id!,
    name: file.name!,
    createdAt: file.createdTime!,
    size: parseInt(file.size || '0'),
  }));
}

// ═══════════════════════════════════════════════════════════════
// GET SNAPSHOT CONTENT
// ═══════════════════════════════════════════════════════════════

export async function getSnapshot(fileId: string): Promise<SnapshotData> {
  const response = await drive.files.get({
    fileId,
    alt: 'media',
  });

  const content = response.data as any;
  return content.data;
}

// ═══════════════════════════════════════════════════════════════
// DELETE SNAPSHOT
// ═══════════════════════════════════════════════════════════════

export async function deleteSnapshot(fileId: string): Promise<void> {
  await drive.files.delete({ fileId });
}

export const driveClient = {
  createSnapshot,  // (data, userId)
  listSnapshots,   // (userId)
  getSnapshot,     // (fileId) — file ID is already user-specific, no userId needed
  deleteSnapshot,  // (fileId)
};
