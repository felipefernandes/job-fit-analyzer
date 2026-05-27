import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import JSZip from 'jszip';

// Configure PDF.js worker using Vite's asset loader
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Extracts plain text from a TXT or MD file.
 * @param {File} file 
 * @returns {Promise<string>}
 */
const parseTextFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result || "");
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo de texto."));
    reader.readAsText(file);
  });
};

/**
 * Extracts plain text from a PDF file with line reconstruction.
 * @param {File} file 
 * @returns {Promise<string>}
 */
const parsePdfFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target.result;
      try {
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const items = textContent.items;

          if (items.length === 0) continue;

          // Group items by their vertical coordinate (Y) to reconstruct lines
          const lines = [];
          items.forEach(item => {
            if (typeof item.str !== 'string') return;
            const x = item.transform[4];
            const y = item.transform[5];

            // Group lines with Y coordinates within a tolerance of 5 units
            let line = lines.find(l => Math.abs(l.y - y) < 5);
            if (!line) {
              line = { y: y, items: [] };
              lines.push(line);
            }
            line.items.push({ x: x, str: item.str });
          });

          // Sort lines from top to bottom
          lines.sort((a, b) => b.y - a.y);

          // Sort characters/words within each line from left to right and join
          const pageText = lines.map(line => {
            line.items.sort((a, b) => a.x - b.x);
            return line.items.map(item => item.str).join(" ");
          }).join("\n");

          fullText.push(pageText);
        }

        resolve(fullText.join("\n\n"));
      } catch (err) {
        reject(new Error(`Erro ao processar o PDF: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo PDF."));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Extracts plain text from a DOCX file using mammoth.
 * @param {File} file 
 * @returns {Promise<string>}
 */
const parseDocxFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target.result;
      try {
        const result = await mammoth.extractRawText({ arrayBuffer });
        resolve(result.value || "");
      } catch (err) {
        reject(new Error(`Erro ao processar o DOCX: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo DOCX."));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Extracts plain text from an ODT file (OpenDocument Text) using jszip.
 * @param {File} file 
 * @returns {Promise<string>}
 */
const parseOdtFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const arrayBuffer = e.target.result;
      try {
        const zip = await JSZip.loadAsync(arrayBuffer);
        const contentFile = zip.file("content.xml");
        if (!contentFile) {
          throw new Error("Arquivo content.xml não encontrado na estrutura do ODT.");
        }
        
        const contentText = await contentFile.async("string");
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(contentText, "text/xml");

        // Recursive helper to traverse the XML document body and pull paragraphs and headings in order
        const extractTextNode = (node, resultArr) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const localName = node.localName;
            if (localName === 'p' || localName === 'h') {
              resultArr.push(node.textContent || "");
              return; // Stop traversing children to avoid duplicate text content
            }
          }
          for (let i = 0; i < node.childNodes.length; i++) {
            extractTextNode(node.childNodes[i], resultArr);
          }
        };

        const resultArr = [];
        const officeText = xmlDoc.getElementsByTagName("office:text")[0] || xmlDoc.documentElement;
        extractTextNode(officeText, resultArr);
        resolve(resultArr.join("\n\n"));
      } catch (err) {
        reject(new Error(`Erro ao processar o ODT: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo ODT."));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Unified entry point to parse various resume file formats client-side.
 * Supports PDF, DOCX, ODT, MD, and TXT.
 * @param {File} file 
 * @returns {Promise<string>}
 */
export const parseResumeFile = async (file) => {
  if (!file) throw new Error("Nenhum arquivo fornecido.");

  const extension = file.name.split('.').pop().toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return await parsePdfFile(file);
    case 'docx':
      return await parseDocxFile(file);
    case 'odt':
      return await parseOdtFile(file);
    case 'txt':
    case 'md':
      return await parseTextFile(file);
    default:
      throw new Error(`O formato .${extension} não é suportado. Por favor, envie um arquivo PDF, DOCX, ODT, MD ou TXT.`);
  }
};
