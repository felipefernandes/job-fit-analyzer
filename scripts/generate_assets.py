import os
import shutil
from PIL import Image

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Caminhos dos arquivos originais na raiz
src_icon_root = os.path.join(ROOT_DIR, "jfa-icon-full-trasp.png")
src_logo_root = os.path.join(ROOT_DIR, "jfa-logo-full-trasp.png")

# Destino das imagens de marca originais (alta resolução)
branding_dir = os.path.join(ROOT_DIR, "src", "assets", "branding")
os.makedirs(branding_dir, exist_ok=True)

dest_icon_branding = os.path.join(branding_dir, "jfa-icon-full-trasp.png")
dest_logo_branding = os.path.join(branding_dir, "jfa-logo-full-trasp.png")

# 1. Copiar/Mover originais para src/assets/branding/
if os.path.exists(src_icon_root):
    shutil.copy2(src_icon_root, dest_icon_branding)
    print(f"Copiado: {src_icon_root} -> {dest_icon_branding}")
if os.path.exists(src_logo_root):
    shutil.copy2(src_logo_root, dest_logo_branding)
    print(f"Copiado: {src_logo_root} -> {dest_logo_branding}")

# Carregar imagens base
icon_img = Image.open(dest_icon_branding)
logo_img = Image.open(dest_logo_branding)

# 2. Gerar ativos da Extensão em extension/assets/
ext_assets_dir = os.path.join(ROOT_DIR, "extension", "assets")
os.makedirs(ext_assets_dir, exist_ok=True)

icon_sizes_ext = {
    "icon-16.png": (16, 16),
    "icon-32.png": (32, 32),
    "icon-48.png": (48, 48),
    "icon-128.png": (128, 128),
    "icon-512.png": (512, 512),
}

for filename, size in icon_sizes_ext.items():
    resized = icon_img.resize(size, Image.Resampling.LANCZOS)
    out_path = os.path.join(ext_assets_dir, filename)
    resized.save(out_path, "PNG", optimize=True)
    print(f"Gerado ícone da extensão: {out_path} ({size[0]}x{size[1]})")

# Logo para a extensão
logo_ext = logo_img.copy()
logo_ext.thumbnail((512, 512), Image.Resampling.LANCZOS)
logo_ext.save(os.path.join(ext_assets_dir, "logo.png"), "PNG", optimize=True)
print(f"Gerado logo da extensão em: {os.path.join(ext_assets_dir, 'logo.png')}")

# 3. Gerar ativos públicos da Web em public/
public_dir = os.path.join(ROOT_DIR, "public")
os.makedirs(public_dir, exist_ok=True)

public_icons = {
    "favicon.png": (32, 32),
    "favicon-16x16.png": (16, 16),
    "favicon-32x32.png": (32, 32),
    "apple-touch-icon.png": (180, 180),
    "icon-192.png": (192, 192),
    "icon-512.png": (512, 512),
}

for filename, size in public_icons.items():
    resized = icon_img.resize(size, Image.Resampling.LANCZOS)
    out_path = os.path.join(public_dir, filename)
    resized.save(out_path, "PNG", optimize=True)
    print(f"Gerado ativo público: {out_path} ({size[0]}x{size[1]})")

# 4. Gerar ativos em src/assets/
src_assets_dir = os.path.join(ROOT_DIR, "src", "assets")
os.makedirs(src_assets_dir, exist_ok=True)

icon_src = icon_img.resize((256, 256), Image.Resampling.LANCZOS)
icon_src.save(os.path.join(src_assets_dir, "icon.png"), "PNG", optimize=True)

logo_src = logo_img.copy()
logo_src.thumbnail((512, 512), Image.Resampling.LANCZOS)
logo_src.save(os.path.join(src_assets_dir, "logo.png"), "PNG", optimize=True)
print("Gerado icon.png e logo.png em src/assets/")

# 5. Remover arquivos antigos da raiz se já foram copiados
if os.path.exists(dest_icon_branding) and os.path.exists(src_icon_root):
    os.remove(src_icon_root)
    print(f"Removido da raiz: {src_icon_root}")
if os.path.exists(dest_logo_branding) and os.path.exists(src_logo_root):
    os.remove(src_logo_root)
    print(f"Removido da raiz: {src_logo_root}")

# 6. Remover vite.svg em public e src/assets se existirem
vite_svg_public = os.path.join(public_dir, "favicon.svg")
vite_svg_src = os.path.join(src_assets_dir, "vite.svg")
if os.path.exists(vite_svg_public):
    os.remove(vite_svg_public)
    print(f"Removido favicon.svg antigo do Vite em public/")
if os.path.exists(vite_svg_src):
    os.remove(vite_svg_src)
    print(f"Removido vite.svg em src/assets/")

print("Todas as imagens foram geradas e organizadas com sucesso!")
