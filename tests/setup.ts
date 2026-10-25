import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { Blob as NodeBlob } from 'node:buffer';
afterEach(cleanup);
// fake-indexeddb uses Node structuredClone, which supports Node Blobs rather than jsdom Blobs.
vi.stubGlobal('Blob', NodeBlob);
vi.stubGlobal(
  'FileReader',
  class {
    result: string | null = null;
    onload: (() => void) | null = null;
    onerror: ((error: unknown) => void) | null = null;
    readAsDataURL(blob: NodeBlob) {
      void blob
        .arrayBuffer()
        .then((buffer) => {
          this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`;
          this.onload?.();
        })
        .catch((error) => this.onerror?.(error));
    }
  },
);
