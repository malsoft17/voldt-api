import fs from 'fs/promises';
import path from 'path';

interface StatsData {
  totalRequest: number;
}

const statsFile = path.join(
  process.cwd(),
  'public',
  'stats.json'
);

let totalRequest = 0;

let writeQueue: Promise<void> = Promise.resolve();

export async function initStats(): Promise<void> {
  try {
    const content = await fs.readFile(statsFile, 'utf8');

    const data = JSON.parse(content) as StatsData;

    totalRequest = Number(data.totalRequest) || 0;
  } catch {
    totalRequest = 0;

    await fs.writeFile(
      statsFile,
      JSON.stringify(
        {
          totalRequest
        },
        null,
        2
      ),
      'utf8'
    );
  }
}

async function saveStats(): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const temporaryFile = `${statsFile}.tmp`;

    await fs.writeFile(
      temporaryFile,
      JSON.stringify(
        {
          totalRequest
        },
        null,
        2
      ),
      'utf8'
    );

    await fs.rename(
      temporaryFile,
      statsFile
    );
  });

  try {
    await writeQueue;
  } catch {
    writeQueue = Promise.resolve();
  }
}

export async function incrementRequest(): Promise<void> {
  totalRequest++;

  await saveStats();
}

export function getTotalRequests(): number {
  return totalRequest;
}
