import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manifestSource = path.resolve(__dirname, '../extension/manifest.json');
const manifestDest = path.resolve(__dirname, '../dist-extension/manifest.json');

const assetsSource = path.resolve(__dirname, '../extension/assets');
const assetsDest = path.resolve(__dirname, '../dist-extension/assets');

try {
  // Garante que o diretório de destino existe
  const destDir = path.dirname(manifestDest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  // Copia manifest.json
  fs.copyFileSync(manifestSource, manifestDest);
  console.log('manifest.json copiado com sucesso para dist-extension/!');

  // Copia pasta de ativos da extensão para dist-extension/assets
  if (fs.existsSync(assetsSource)) {
    fs.cpSync(assetsSource, assetsDest, { recursive: true });
    console.log('Arquivos de ativos (extension/assets) copiados para dist-extension/assets/!');
  }
} catch (err) {
  console.error('Erro ao copiar manifest.json ou ativos:', err);
  process.exit(1);
}
