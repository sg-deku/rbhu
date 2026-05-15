import { Request, Response } from 'express';
import * as vectorStoreService from '../services/vector-store.service';

/**
 * Controller for vector index management.
 * RB-36: Implement index management scripts (creation, deletion, re-indexing).
 */
export const setupIndex = async (req: Request, res: Response) => {
  try {
    await vectorStoreService.ensureIndexExists();
    res.status(200).json({ success: true, message: 'Vector index ensured.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removeIndex = async (req: Request, res: Response) => {
  try {
    await vectorStoreService.deleteIndex();
    res.status(200).json({ success: true, message: 'Vector index deleted.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rebuildIndex = async (req: Request, res: Response) => {
  try {
    await vectorStoreService.reindex();
    res.status(200).json({ success: true, message: 'Vector index re-indexed.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
