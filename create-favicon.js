// Script para crear un favicon cuadrado con el logo centrado
// Requiere: npm install sharp
const fs = require('fs');
const path = require('path');

async function createFavicon() {
  try {
    const sharp = require('sharp');
    const inputPath = path.join(__dirname, 'src', 'public', 'images', 'logo-horizontal-1920x1080.png');
    const outputPath = path.join(__dirname, 'src', 'public', 'images', 'favicon.png');
    
    // Verificar que el archivo de entrada existe
    if (!fs.existsSync(inputPath)) {
      throw new Error(`No se encontró el archivo: ${inputPath}`);
    }
    
    // Crear un cuadrado de 512x512 (tamaño estándar para favicons)
    const size = 512;
    
    // Cargar el logo original y redimensionarlo manteniendo relación de aspecto
    const logoBuffer = await sharp(inputPath)
      .resize(size, null, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toBuffer();
    
    // Crear un canvas cuadrado blanco y centrar el logo
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([{
        input: logoBuffer,
        gravity: 'center'
      }])
      .png()
      .toFile(outputPath);
    
    console.log('✅ Favicon cuadrado creado exitosamente en:', outputPath);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ Error: sharp no está instalado');
      console.log('💡 Ejecuta: npm install sharp');
    } else {
      console.error('❌ Error al crear favicon:', error.message);
      console.log('\n💡 Alternativa: Usa una herramienta online como https://realfavicongenerator.net/');
      console.log('   Sube tu logo-horizontal-1920x1080.png y genera un favicon cuadrado');
    }
  }
}

createFavicon();









