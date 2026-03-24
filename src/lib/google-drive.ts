import { google } from 'googleapis';

const FOLDER_NAME = 'MoneyMngr_Snapshots';

// ─── Auth from user's OAuth token ────────────────────────────────────────────

function getDriveClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

// ─── Get or create snapshot folder ───────────────────────────────────────────

async function getSnapshotsFolderId(accessToken: string): Promise<string> {
  const drive = getDriveClient(accessToken);

  const res = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Create the folder
  const folder = await drive.files.create({
    requestBody: {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  return folder.data.id!;
}

// ─── Create Snapshot ──────────────────────────────────────────────────────────

interface SnapshotData {
  accounts: any[];
  categories: any[];
  transactions: any[];
}

export async function createSnapshot(
  accessToken: string,
  data: SnapshotData
): Promise<{ id: string; name: string; createdAt: string; folderLink: string }> {
  const drive = getDriveClient(accessToken);
  const folderId = await getSnapshotsFolderId(accessToken);

  const timestamp = new Date().toISOString();
  const fileName = `snapshot_${timestamp.replace(/[:.]/g, '-')}.json`;

  const content = {
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
      body: JSON.stringify(content, null, 2),
    },
    fields: 'id, name, createdTime',
  });

  const folderLink = `https://drive.google.com/drive/folders/${folderId}`;

  return {
    id: file.data.id!,
    name: file.data.name!,
    createdAt: timestamp,
    folderLink,
  };
}

// ─── List Snapshots ───────────────────────────────────────────────────────────

export interface SnapshotInfo {
  id: string;
  name: string;
  createdAt: string;
  size: number;
  folderLink: string;
}

export async function listSnapshots(
  accessToken: string
): Promise<{ snapshots: SnapshotInfo[]; folderLink: string }> {
  const drive = getDriveClient(accessToken);
  const folderId = await getSnapshotsFolderId(accessToken);

  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType='application/json' and trashed=false`,
    fields: 'files(id, name, createdTime, size)',
    orderBy: 'createdTime desc',
    spaces: 'drive',
  });

  const folderLink = `https://drive.google.com/drive/folders/${folderId}`;

  const snapshots = (res.data.files || []).map((file) => ({
    id: file.id!,
    name: file.name!,
    createdAt: file.createdTime!,
    size: parseInt(file.size || '0'),
    folderLink,
  }));

  return { snapshots, folderLink };
}

// ─── Get Snapshot Content ─────────────────────────────────────────────────────

export async function getSnapshot(
  accessToken: string,
  fileId: string
): Promise<SnapshotData> {
  const drive = getDriveClient(accessToken);

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'json' }
  );

  const content = res.data as any;
  return content.data;
}

// ─── Delete Snapshot ──────────────────────────────────────────────────────────

export async function deleteSnapshot(
  accessToken: string,
  fileId: string
): Promise<void> {
  const drive = getDriveClient(accessToken);
  await drive.files.delete({ fileId });
}

export const driveClient = {
  createSnapshot,
  listSnapshots,
  getSnapshot,
  deleteSnapshot,
};
