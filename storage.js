import { promises as fs } from 'node:fs';
import path from 'node:path';

// Handle both local development and production paths
const DATA_DIR = process.env.NODE_ENV === 'production'
  ? path.resolve(process.cwd(), 'data')
  : path.resolve(process.cwd(), 'server', 'data');
  
const DATA_FILE = path.join(DATA_DIR, 'db.json');

async function ensure() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    const initial = { products: [], events: [], sales: [], categories: [], flash: { enabled: false, bannerUrl: '' }, users: [], sessions: [] };
    await fs.writeFile(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
  }
}

export async function readStore() {
  await ensure();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  const parsed = JSON.parse(raw || '{}');
  if (!parsed.categories) parsed.categories = [];
  if (!parsed.products) parsed.products = [];
  if (!parsed.events) parsed.events = [];
  if (!parsed.sales) parsed.sales = [];
  if (!parsed.flash) parsed.flash = { enabled: false, bannerUrl: '' };
  if (!parsed.users) parsed.users = [];
  if (!parsed.sessions) parsed.sessions = [];
  return parsed;
}

export async function writeStore(data) {
  await ensure();
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}
