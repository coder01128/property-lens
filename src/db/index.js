import Dexie from 'dexie';
import { SCHEMA, DB_VERSION } from './schema.js';

const db = new Dexie('PropertyLensDB');
db.version(DB_VERSION).stores(SCHEMA);

export default db;
