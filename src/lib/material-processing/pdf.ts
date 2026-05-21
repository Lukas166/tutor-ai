import { tmpdir } from "os";
import { join } from "path";
import { createCanvas, DOMMatrix, ImageData } from "canvas";
import { createWorker, type Worker as TesseractWorker } from "tesseract.js";
import {
  PDF_OCR_ENABLED,
  PDF_OCR_LANGUAGES,
  PDF_RENDER_SCALE,
} from "@/lib/material-processing/config";

export type ExtractedPdfPage = {
  pageNumber: number;
  embeddedText: string;
  ocrText: string;
  finalText: string;
  imageOcrAttempted: boolean;
  metadata: Record<string, string | number | boolean | null>;
};

type ExtractionCallbacks = {
  onExtractedText?: (pageNumber: number, pageCount: number) => Promise<void>;
  onOcrPage?: (pageNumber: number, pageCount: number) => Promise<void>;
};

function installCanvasGlobals() {
  const target = globalThis as Record<string, unknown>;

  target.DOMMatrix ??= DOMMatrix;
  target.ImageData ??= ImageData;
}

export function cleanExtractedText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/-\n(?=[A-Za-z0-9])/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTextItems(items: unknown[]) {
  return cleanExtractedText(
    items
      .map((item) => {
        if (typeof item === "object" && item !== null && "str" in item) {
          return String((item as { str?: string }).str ?? "");
        }

        return "";
      })
      .filter(Boolean)
      .join(" ")
  );
}

async function createOcrWorker() {
  if (!PDF_OCR_ENABLED) return null;
  return createWorker(PDF_OCR_LANGUAGES, 1, {
    cachePath: join(tmpdir(), "tutor-ai-tesseract"),
  });
}

async function renderPageToPngBuffer(page: {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: Record<string, unknown>) => { promise: Promise<void> };
}) {
  const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");

  await page.render({
    canvasContext: context,
    canvas,
    viewport,
  }).promise;

  return canvas.toBuffer("image/png");
}

async function recognizePage(
  worker: TesseractWorker | null,
  page: Parameters<typeof renderPageToPngBuffer>[0]
) {
  if (!worker) {
    return { text: "", attempted: false, error: null as string | null };
  }

  try {
    const image = await renderPageToPngBuffer(page);
    const result = await worker.recognize(image);
    return {
      text: cleanExtractedText(result.data.text ?? ""),
      attempted: true,
      error: null,
    };
  } catch (error) {
    return {
      text: "",
      attempted: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function extractPdfPages(
  buffer: Buffer,
  callbacks: ExtractionCallbacks = {}
): Promise<ExtractedPdfPage[]> {
  installCanvasGlobals();

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
  } as unknown as Parameters<typeof pdfjs.getDocument>[0]).promise;

  const pageCount = document.numPages;
  const pages: ExtractedPdfPage[] = [];
  let worker: TesseractWorker | null = null;
  let workerError: string | null = null;

  try {
    worker = await createOcrWorker();
  } catch (error) {
    workerError = error instanceof Error ? error.message : String(error);
  }

  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const embeddedText = extractTextItems(textContent.items as unknown[]);
      await callbacks.onExtractedText?.(pageNumber, pageCount);

      const ocr = await recognizePage(worker, page as unknown as Parameters<typeof recognizePage>[1]);
      await callbacks.onOcrPage?.(pageNumber, pageCount);

      const finalText = cleanExtractedText(
        [embeddedText, ocr.text].filter(Boolean).join("\n\n")
      );

      pages.push({
        pageNumber,
        embeddedText,
        ocrText: ocr.text,
        finalText,
        imageOcrAttempted: ocr.attempted,
        metadata: {
          embeddedTextLength: embeddedText.length,
          ocrTextLength: ocr.text.length,
          ocrError: ocr.error,
          ocrWorkerError: workerError,
          renderScale: PDF_RENDER_SCALE,
        },
      });
    }
  } finally {
    await worker?.terminate();
    await document.destroy();
  }

  return pages;
}
