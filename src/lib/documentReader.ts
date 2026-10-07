// Extracteur de texte côté client pour PDF, ePub et fichiers texte
import JSZip from 'jszip';

export interface ExtractedDocument {
  name: string;
  size: number;
  type: 'pdf' | 'epub' | 'text';
  text: string;
  pageCount?: number;
  charCount: number;
}

/**
 * Nettoie le code HTML extrait d'un ePub pour n'en garder que la prose lisible.
 */
function cleanHtmlToText(html: string): string {
  if (typeof window === 'undefined') return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Supprimer les styles, scripts, SVG, métadonnées
    const toRemove = doc.querySelectorAll('script, style, link, meta, noscript, svg');
    toRemove.forEach((el) => el.remove());

    const text = doc.body.textContent || doc.body.innerText || '';
    // Nettoyer les espaces multiples et sauts de ligne excessifs
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();
  } catch {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

/**
 * Extrait le texte d'un livre numérique ePub (.epub).
 * Un ePub est une archive ZIP contenant des fichiers XHTML/HTML structurés.
 */
export async function extractTextFromEpub(file: File): Promise<ExtractedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Chercher tous les fichiers de chapitres XHTML / HTML / XML
  const contentFiles: { path: string; file: any }[] = [];
  zip.forEach((relativePath, zipEntry) => {
    if (
      !zipEntry.dir &&
      /\.(xhtml|html|htm|xml)$/i.test(relativePath) &&
      !relativePath.toLowerCase().includes('toc.') &&
      !relativePath.toLowerCase().includes('container.xml')
    ) {
      contentFiles.push({ path: relativePath, file: zipEntry });
    }
  });

  // Trier par chemin d'accès naturel pour suivre la chronologie des chapitres
  contentFiles.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' }));

  const chaptersText: string[] = [];
  for (const item of contentFiles) {
    try {
      const rawHtml = await item.file.async('text');
      const cleaned = cleanHtmlToText(rawHtml);
      if (cleaned && cleaned.length > 30) {
        chaptersText.push(cleaned);
      }
    } catch (err) {
      console.warn(`[EpubReader] Erreur lecture chapitre ${item.path}:`, err);
    }
  }

  const fullText = chaptersText.join('\n\n--- Chapitre Suivant ---\n\n').trim();

  return {
    name: file.name,
    size: file.size,
    type: 'epub',
    text: fullText || 'Le document ePub semble vide ou aucun texte lisible n\'a pu être extrait.',
    pageCount: contentFiles.length,
    charCount: fullText.length,
  };
}

/**
 * Extrait le texte d'un document PDF (.pdf) via pdfjs-dist.
 */
export async function extractTextFromPdf(file: File): Promise<ExtractedDocument> {
  const arrayBuffer = await file.arrayBuffer();

  // Chargement dynamique de pdfjs pour éviter les blocages SSR
  const pdfjsLib = await import('pdfjs-dist/build/pdf.min.mjs');

  // Définition du worker via un CDN moderne compatible version
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  }

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const pagesText: string[] = [];

  // Extraire les pages (limite sécuritaire de 120 pages max pour éviter l'explosion mémoire)
  const maxPagesToRead = Math.min(numPages, 120);
  for (let pageNum = 1; pageNum <= maxPagesToRead; pageNum++) {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean);
      const pageJoined = pageStrings.join(' ').trim();
      if (pageJoined) {
        pagesText.push(`[Page ${pageNum}]\n${pageJoined}`);
      }
    } catch (err) {
      console.warn(`[PdfReader] Erreur lecture page ${pageNum}:`, err);
    }
  }

  const fullText = pagesText.join('\n\n').trim();

  return {
    name: file.name,
    size: file.size,
    type: 'pdf',
    text: fullText || 'Le document PDF ne contient aucun texte sélectionnable (possiblement un document scanné sous forme d\'images).',
    pageCount: numPages,
    charCount: fullText.length,
  };
}

/**
 * Extrait le texte d'un fichier texte brut ou markdown.
 */
export async function extractTextFromPlainText(file: File): Promise<ExtractedDocument> {
  const text = await file.text();
  return {
    name: file.name,
    size: file.size,
    type: 'text',
    text: text.trim(),
    charCount: text.length,
  };
}

/**
 * Fonction universelle de traitement de document (ePub, PDF, TXT, MD).
 */
export async function parseDocumentFile(file: File): Promise<ExtractedDocument> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (extension === 'epub' || file.type.includes('epub')) {
    return extractTextFromEpub(file);
  }

  if (extension === 'pdf' || file.type.includes('pdf')) {
    return extractTextFromPdf(file);
  }

  if (['txt', 'md', 'markdown', 'json', 'csv'].includes(extension) || file.type.startsWith('text/')) {
    return extractTextFromPlainText(file);
  }

  throw new Error(`Format de fichier non pris en charge (.${extension}). Merci de sélectionner un fichier .epub, .pdf, .txt ou .md.`);
}
