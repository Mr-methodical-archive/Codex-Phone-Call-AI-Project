import '../store/db.js';
import { db } from '../store/db.js';
import { logger } from '../utils/logger.js';

logger.info('Database migrations applied.');
db.close();
