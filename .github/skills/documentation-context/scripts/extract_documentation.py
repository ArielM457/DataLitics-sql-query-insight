#!/usr/bin/env python3
"""
Script to extract text content from Documentación.pdf
This script is used by the documentation-context skill to load documentation context.
"""

import sys
from pathlib import Path

def extract_pdf_content():
    """Extract and print all text content from Documentación.pdf"""
    
    try:
        import pdfplumber
    except ImportError:
        print("⚠️  pdfplumber no está instalado. Instalando...", file=sys.stderr)
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pdfplumber", "-q"])
        import pdfplumber
    
    # Buscar el PDF en el directorio raíz del proyecto
    pdf_path = Path(__file__).parent.parent.parent.parent / "Documentación.pdf"
    
    if not pdf_path.exists():
        print(f"❌ Error: No se encontró {pdf_path}", file=sys.stderr)
        sys.exit(1)
    
    print(f"📖 Extrayendo contenido de: {pdf_path.name}", file=sys.stderr)
    print("-" * 80)
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            print(f"📄 Total de páginas: {len(pdf.pages)}\n", file=sys.stderr)
            
            for page_num, page in enumerate(pdf.pages, 1):
                text = page.extract_text()
                if text:
                    print(f"\n{'='*80}")
                    print(f"PÁGINA {page_num}")
                    print(f"{'='*80}\n")
                    print(text)
                    
        print("\n" + "-" * 80, file=sys.stderr)
        print("✅ Contenido extraído exitosamente", file=sys.stderr)
        
    except Exception as e:
        print(f"❌ Error al leer el PDF: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    extract_pdf_content()
