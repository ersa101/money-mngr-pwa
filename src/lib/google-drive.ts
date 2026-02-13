import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

const FOLDER_NAME = 'MoneyMngr_Snapshots';

// Get or create snapshots folder
async function getSnapshotsFolderId(): Promise<string> {
  // Search for existing folder
  const response = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  // Create folder
  const folder = await drive.files.create({
    requestBody: {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  return folder.data.id!;
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

export async function createSnapshot(data: SnapshotData): Promise<{
  id: string;
  name: string;
  createdAt: string;
}> {
  const folderId = await getSnapshotsFolderId();
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

export async function listSnapshots(): Promise<SnapshotInfo[]> {
  const folderId = await getSnapshotsFolderId();

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
  createSnapshot,
  listSnapshots,
  getSnapshot,
  deleteSnapshot,
};
