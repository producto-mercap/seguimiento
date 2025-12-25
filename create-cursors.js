/**
 * Script para crear cursores PNG desde SVG
 * Requiere: npm install sharp
 * Ejecutar: node create-cursors.js
 */

const fs = require('fs');
const path = require('path');

// Si sharp no está disponible, mostrar instrucciones
try {
    const sharp = require('sharp');
    
    const imagesDir = path.join(__dirname, 'src', 'public', 'images');
    const grabSvg = path.join(imagesDir, 'cursor-grab.svg');
    const grabbingSvg = path.join(imagesDir, 'cursor-grabbing.svg');
    
    async function createCursors() {
        try {
            // Convertir cursor-grab.svg a PNG
            if (fs.existsSync(grabSvg)) {
                await sharp(grabSvg)
                    .resize(24, 24)
                    .png()
                    .toFile(path.join(imagesDir, 'cursor-grab.png'));
                console.log('✓ cursor-grab.png creado');
            }
            
            // Convertir cursor-grabbing.svg a PNG
            if (fs.existsSync(grabbingSvg)) {
                await sharp(grabbingSvg)
                    .resize(24, 24)
                    .png()
                    .toFile(path.join(imagesDir, 'cursor-grabbing.png'));
                console.log('✓ cursor-grabbing.png creado');
            }
            
            console.log('\n¡Cursores PNG creados exitosamente!');
        } catch (error) {
            console.error('Error al crear cursores:', error);
        }
    }
    
    createCursors();
} catch (e) {
    console.log(`
Para crear los cursores PNG, necesitas instalar 'sharp':
  npm install sharp

Luego ejecuta este script nuevamente:
  node create-cursors.js

O puedes convertir los SVG a PNG manualmente usando:
- https://cloudconvert.com/svg-to-png
- https://convertio.co/svg-png/
- O cualquier editor de imágenes

Los archivos SVG están en: src/public/images/
    `);
}


