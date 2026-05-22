import {

  Injectable,

  ServiceUnavailableException,

} from '@nestjs/common';

import OpenAI from 'openai';

import { AppConfigService } from '../config/app-config.service';

import { EmbedTextsResult, TokenUsage } from '../usage/embedding.types';



@Injectable()

export class EmbeddingService {

  private client: OpenAI | null = null;



  constructor(private readonly config: AppConfigService) {}



  private getOpenAIClient(): OpenAI {

    const key = this.config.openaiApiKey;

    if (!key) {

      throw new ServiceUnavailableException(

        'OPENAI_API_KEY is not set. Add it to api/.env or use EMBEDDING_PROVIDER=ollama',

      );

    }

    if (!this.client) {

      this.client = new OpenAI({ apiKey: key });

    }

    return this.client;

  }



  get model(): string {

    return this.config.embeddingModel;

  }



  get dimensions(): number {

    return this.config.embeddingDimensions;

  }



  get provider(): string {

    return this.config.embeddingProvider;

  }



  async embedTexts(texts: string[]): Promise<EmbedTextsResult> {

    if (texts.length === 0) {

      return {

        vectors: [],

        usage: { promptTokens: 0, totalTokens: 0 },

      };

    }

    if (this.config.embeddingProvider === 'ollama') {

      const vectors = await this.embedOllama(texts);

      const approxTokens = texts.reduce(

        (sum, t) => sum + Math.ceil(t.length / 4),

        0,

      );

      return {

        vectors,

        usage: { promptTokens: approxTokens, totalTokens: approxTokens },

      };

    }

    return this.embedOpenAI(texts);

  }



  async embedQuery(text: string): Promise<number[]> {

    const { vectors } = await this.embedTexts([text]);

    return vectors[0];

  }



  private async embedOpenAI(texts: string[]): Promise<EmbedTextsResult> {

    const client = this.getOpenAIClient();

    const response = await client.embeddings.create({

      model: this.model,

      input: texts,

      dimensions: this.dimensions,

    });

    const usage: TokenUsage = {

      promptTokens: response.usage?.prompt_tokens ?? 0,

      totalTokens: response.usage?.total_tokens ?? 0,

    };

    return {

      vectors: response.data

        .sort((a, b) => a.index - b.index)

        .map((row) => row.embedding),

      usage,

    };

  }



  private async embedOllama(texts: string[]): Promise<number[][]> {

    const base = this.config.ollamaBaseUrl.replace(/\/$/, '');

    const res = await fetch(`${base}/api/embed`, {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({

        model: this.model,

        input: texts.length === 1 ? texts[0] : texts,

      }),

    });

    if (!res.ok) {

      const body = await res.text();

      throw new ServiceUnavailableException(

        `Ollama embed failed (${res.status}): ${body}. Is Ollama running? ollama pull ${this.model}`,

      );

    }

    const data = (await res.json()) as { embeddings?: number[][] };

    if (!data.embeddings?.length) {

      throw new ServiceUnavailableException('Ollama returned no embeddings');

    }

    return data.embeddings;

  }

}


