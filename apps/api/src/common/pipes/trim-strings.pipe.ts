import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class TrimStringsPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type !== 'body' || value === null || typeof value !== 'object') {
      return value;
    }

    return this.trimObject(value as Record<string, unknown>);
  }

  private trimObject(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.entries(payload).reduce<Record<string, unknown>>((accumulator, [key, entry]) => {
      if (typeof entry === 'string') {
        accumulator[key] = entry.trim();
        return accumulator;
      }

      if (Array.isArray(entry)) {
        accumulator[key] = entry.map((item) =>
          typeof item === 'string' ? item.trim() : item,
        );
        return accumulator;
      }

      if (entry && typeof entry === 'object') {
        accumulator[key] = this.trimObject(entry as Record<string, unknown>);
        return accumulator;
      }

      accumulator[key] = entry;
      return accumulator;
    }, {});
  }
}
