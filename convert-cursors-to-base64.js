/**
 * Script para convertir cursores PNG a base64 y generar CSS
 */

const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'src', 'public', 'images');
const grabPng = path.join(imagesDir, 'cursor-grab.png');
const grabbingPng = path.join(imagesDir, 'cursor-grabbing.png');

function convertToBase64(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`Archivo no encontrado: ${filePath}`);
        return null;
    }
    
    const imageBuffer = fs.readFileSync(filePath);
    const base64 = imageBuffer.toString('base64');
    return `data:image/png;base64,${base64}`;
}

const grabBase64 = convertToBase64(grabPng);
const grabbingBase64 = convertToBase64(grabbingPng);

if (grabBase64 && grabbingBase64) {
    console.log('Cursores convertidos a base64 exitosamente');
    console.log('\nCSS generado:');
    console.log('\n.gantt-timeline,\n.gantt-timeline.gantt-draggable {');
    console.log(`    cursor: url('${grabBase64}') 12 12, -webkit-grab, grab !important;`);
    console.log('}');
    console.log('\n.gantt-timeline:active,\n.gantt-timeline.gantt-dragging {');
    console.log(`    cursor: url('${grabbingBase64}') 12 12, -webkit-grabbing, grabbing !important;`);
    console.log('}');
    
    // Guardar en un archivo temporal para copiar
    const outputFile = path.join(__dirname, 'cursors-base64.txt');
    fs.writeFileSync(outputFile, 
        `.gantt-timeline,\n.gantt-timeline.gantt-draggable {\n    cursor: url('${grabBase64}') 12 12, -webkit-grab, grab !important;\n}\n\n.gantt-timeline:active,\n.gantt-timeline.gantt-dragging {\n    cursor: url('${grabbingBase64}') 12 12, -webkit-grabbing, grabbing !important;\n}`
    );
    console.log(`\n✓ CSS guardado en: ${outputFile}`);
} else {
    console.error('Error al convertir los cursores');
}


