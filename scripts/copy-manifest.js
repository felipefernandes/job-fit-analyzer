import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const source = path.resolve(__dirname, '../extension/manifest.json');
const dest = path.resolve(__dirname, '../dist-extension/manifest.json');

try {
  // Garante que o diretório de destino existe
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  fs.copyFileSync(source, dest);
  console.log('manifest.json copiado com sucesso para dist-extension/!');
} catch (err) {
  console.error('Erro ao copiar manifest.json:', err);
  process.exit(1);
}
