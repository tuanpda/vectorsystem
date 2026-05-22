import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import AdmZip = require('adm-zip');
import { MinioService } from '../storage/minio.service';

export interface StoredParseArtifacts {
  markdownKey: string | null;
  contentListKey: string | null;
  imagesPrefix: string | null;
  uploadedKeys: string[];
}

@Injectable()
export class ParseStorageService {
  private readonly logger = new Logger(ParseStorageService.name);

  constructor(private readonly storage: MinioService) {}

  async storeZipResults(
    zipBuffer: Buffer,
    tenantId: string,
    documentId: string,
    fileStem: string,
  ): Promise<StoredParseArtifacts> {
    const zip = new AdmZip(zipBuffer);
    const prefix = `parsed/${tenantId}/${documentId}`;
    const uploadedKeys: string[] = [];
    let markdownKey: string | null = null;
    let contentListKey: string | null = null;
    let imagesPrefix: string | null = null;

    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) {
        continue;
      }
      const safeRelative = sanitizeZipEntry(entry.entryName);
      if (!safeRelative) {
        this.logger.warn(`Skip unsafe zip entry: ${entry.entryName}`);
        continue;
      }

      const key = `${prefix}/${safeRelative.replace(/\\/g, '/')}`;
      const data = entry.getData();
      await this.storage.putObject(key, data);
      uploadedKeys.push(key);

      const base = path.basename(safeRelative);
      if (base === `${fileStem}.md` || base.endsWith('.md')) {
        if (!markdownKey || base === `${fileStem}.md`) {
          markdownKey = key;
        }
      }
      if (
        base === `${fileStem}_content_list.json` ||
        base.endsWith('_content_list.json')
      ) {
        if (!contentListKey || base === `${fileStem}_content_list.json`) {
          contentListKey = key;
        }
      }
      if (safeRelative.includes('/images/') || safeRelative.startsWith('images/')) {
        imagesPrefix = `${prefix}/images`;
      }
    }

    if (!imagesPrefix) {
      const imagesEntry = uploadedKeys.find((k) => k.includes('/images/'));
      if (imagesEntry) {
        imagesPrefix = `${prefix}/images`;
      }
    }

    return {
      markdownKey,
      contentListKey,
      imagesPrefix,
      uploadedKeys,
    };
  }
}

function sanitizeZipEntry(name: string): string | null {
  const normalized = name.replace(/\\/g, '/');
  if (normalized.startsWith('/') || normalized.includes('..')) {
    return null;
  }
  return normalized;
}
