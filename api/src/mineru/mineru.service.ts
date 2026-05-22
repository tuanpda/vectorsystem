import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import FormData = require('form-data');
import * as path from 'path';
import { AppConfigService } from '../config/app-config.service';
import {
  MineruParseFormOptions,
  MineruSubmitResponse,
  MineruTaskStatus,
} from './mineru.types';

@Injectable()
export class MineruService {
  private readonly logger = new Logger(MineruService.name);
  private readonly http: AxiosInstance;

  constructor(private readonly config: AppConfigService) {
    this.http = axios.create({
      baseURL: config.mineruApiUrl.replace(/\/$/, ''),
      timeout: 120_000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
  }

  /** Fast probe — hung MinerU (port open, no HTTP) must not block dashboard 10s+ */
  async checkHealth(): Promise<boolean> {
    const paths = ['/health', '/docs', '/openapi.json', '/'];
    for (const path of paths) {
      try {
        const res = await this.http.get(path, {
          timeout: 2_500,
          validateStatus: (s) => s >= 200 && s < 500,
        });
        if (res.status >= 200 && res.status < 500) {
          return true;
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.code === 'ECONNREFUSED') {
          return false;
        }
      }
    }
    return false;
  }

  mapLanguageToMineru(language: string): string {
    const map: Record<string, string> = {
      vi: 'en',
      en: 'en',
      ch: 'ch',
      zh: 'ch',
      ja: 'japan',
      ko: 'korean',
    };
    return map[language.toLowerCase()] ?? 'en';
  }

  buildFormData(options: MineruParseFormOptions): FormData {
    const form = new FormData();
    const langs =
      options.langList.length > 0
        ? options.langList
        : [this.mapLanguageToMineru(options.language)];
    for (const lang of langs) {
      form.append('lang_list', lang);
    }
    form.append('backend', options.backend);
    form.append('parse_method', options.parseMethod);
    form.append('formula_enable', 'true');
    form.append('table_enable', 'true');
    form.append('image_analysis', 'true');
    form.append('return_md', 'true');
    form.append('return_middle_json', 'false');
    form.append('return_model_output', 'false');
    form.append('return_content_list', 'true');
    form.append('return_images', 'false');
    form.append('response_format_zip', 'true');
    form.append('return_original_file', 'false');
    form.append('start_page_id', '0');
    form.append('end_page_id', '99999');
    return form;
  }

  async submitTask(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    options: MineruParseFormOptions,
  ): Promise<MineruSubmitResponse> {
    const healthy = await this.checkHealth();
    if (!healthy) {
      throw new ServiceUnavailableException(
        `MinerU API is not reachable at ${this.config.mineruApiUrl}. Start it with: cd MinerU && .\\run-mineru.ps1 api`,
      );
    }

    const form = this.buildFormData(options);
    form.append('files', fileBuffer, {
      filename: fileName,
      contentType: mimeType,
    });

    try {
      const res = await this.http.post<MineruSubmitResponse>('/tasks', form, {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
      });
      if (res.status !== 202 || !res.data?.task_id) {
        throw new BadGatewayException('MinerU returned invalid task submission');
      }
      return res.data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data ?? err.message;
        this.logger.error(`MinerU submit failed: ${JSON.stringify(detail)}`);
        throw new BadGatewayException(
          `MinerU submit failed: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`,
        );
      }
      throw err;
    }
  }

  async pollUntilDone(
    statusUrl: string,
    timeoutMs: number,
    intervalMs: number,
  ): Promise<MineruTaskStatus> {
    const deadline = Date.now() + timeoutMs;
    const url = this.resolveUrl(statusUrl);

    while (Date.now() < deadline) {
      const res = await this.http.get<MineruTaskStatus>(url);
      const status = res.data?.status;
      if (status === 'completed') {
        return res.data;
      }
      if (status === 'failed') {
        throw new BadGatewayException(
          `MinerU task failed: ${JSON.stringify(res.data)}`,
        );
      }
      if (status !== 'pending' && status !== 'processing') {
        throw new BadGatewayException(
          `MinerU unknown status: ${JSON.stringify(res.data)}`,
        );
      }
      await sleep(intervalMs);
    }
    throw new BadGatewayException(
      `MinerU task timed out after ${timeoutMs}ms`,
    );
  }

  async downloadResultZip(resultUrl: string): Promise<Buffer> {
    const url = this.resolveUrl(resultUrl);
    const res = await this.http.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: 600_000,
    });
    if (res.status !== 200) {
      throw new BadGatewayException(
        `MinerU result download failed: HTTP ${res.status}`,
      );
    }
    const contentType = String(res.headers['content-type'] ?? '');
    if (!contentType.includes('zip') && !contentType.includes('octet-stream')) {
      const preview = Buffer.from(res.data).toString('utf8', 0, 200);
      throw new BadGatewayException(
        `Expected ZIP from MinerU, got ${contentType}: ${preview}`,
      );
    }
    return Buffer.from(res.data);
  }

  fileStem(originalName: string): string {
    return path.basename(originalName, path.extname(originalName));
  }

  private resolveUrl(maybeRelative: string): string {
    if (maybeRelative.startsWith('http')) {
      return maybeRelative;
    }
    const base = this.config.mineruApiUrl.replace(/\/$/, '');
    return `${base}${maybeRelative.startsWith('/') ? '' : '/'}${maybeRelative}`;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
