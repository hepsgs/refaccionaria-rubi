import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string;
  marca: string;
  modelo: string;
  año_inicio: number;
  año_fin: number;
  precio: number;
  stock: number;
  imagenes: string[];
  proveedor?: string;
  tipo?: string;
}

interface ExportOptions {
  includeImages: boolean;
  includePrice: boolean;
  template: 'table' | 'grid';
}

const getBase64ImageFromURL = (url: string, maxWidth = 200): Promise<{data: string, width: number, height: number}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "anonymous");
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const isPng = url.toLowerCase().includes('.png') || maxWidth > 400;
      const dataURL = canvas.toDataURL(isPng ? "image/png" : "image/jpeg", isPng ? 1.0 : 0.6);
      resolve({
        data: dataURL,
        width: canvas.width,
        height: canvas.height
      });
    };
    img.onerror = (error) => reject(error);
    img.src = url;
  });
};

export const generateCatalogPDF = async (data: Product[], options: ExportOptions, config: any) => {
  // Pre-fetch logo info once to use synchronously in headers
  let logoInfo = null;
  if (config?.logo_url) {
    try {
      logoInfo = await getBase64ImageFromURL(config.logo_url, 400);
    } catch (e) {
      console.error("Error loading logo:", e);
    }
  }

  if (options.template === 'grid') {
    return generateGridCatalog(data, options, config, logoInfo);
  } else {
    return generateTableCatalog(data, options, config, logoInfo);
  }
};

const generateTableCatalog = async (data: Product[], options: ExportOptions, config: any, logoInfo: any) => {
  const doc = new jsPDF();
  const repeatHeader = config?.pdf_repeat_header !== false;

  // Initial header
  addHeader(doc, config, logoInfo);

  const tableColumn = [];
  if (options.includeImages) tableColumn.push(""); // Column for image
  tableColumn.push("SKU", "Producto", "Marca");
  if (config?.show_modelo !== false) tableColumn.push("Modelo");
  tableColumn.push("Año", "Tipo");
  if (config?.show_proveedor !== false) tableColumn.push("Proveedor");
  if (options.includePrice) tableColumn.push("Precio");

  const imagesMap = new Map<string, string>();
  if (options.includeImages) {
    await fetchImagesInBatches(data, imagesMap);
  }

  const tableRows = data.map(p => {
    const row = [];
    if (options.includeImages) row.push(""); 
    row.push(String(p.sku), p.nombre, p.marca);
    if (config?.show_modelo !== false) row.push(p.modelo || 'N/A');
    
    const anoStr = p.año_inicio && p.año_fin 
      ? `${p.año_inicio}-${p.año_fin}` 
      : p.año_inicio 
        ? `${p.año_inicio}` 
        : 'N/A';
        
    row.push(anoStr, p.tipo || 'N/A');
    if (config?.show_proveedor !== false) row.push(p.proveedor || 'N/A');
    if (options.includePrice) {
      row.push(`$${p.precio.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }
    return row;
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 65,
    styles: { fontSize: 8, cellPadding: 3, font: 'helvetica', valign: 'middle' },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: repeatHeader ? 65 : 20 },
    columnStyles: {
      0: options.includeImages ? { cellWidth: 20 } : {},
    },
    didDrawCell: (dataArg: any) => {
      if (options.includeImages && dataArg.section === 'body' && dataArg.column.index === 0) {
        const product = data[dataArg.row.index];
        const base64 = imagesMap.get(product?.id);
        if (base64) {
          doc.addImage(base64, 'JPEG', dataArg.cell.x + 2, dataArg.cell.y + 2, 16, 16);
        }
      }
    },
    didDrawPage: (dataArg: any) => {
      // Draw header on subsequent pages only if repeatHeader is true
      if (repeatHeader && dataArg.pageNumber > 1) {
        addHeader(doc, config, logoInfo);
      }
      
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Página ${dataArg.pageNumber} de ${pageCount}`, 196, 285, { align: 'right' });
    },
    bodyStyles: options.includeImages ? { minCellHeight: 20 } : {}
  });

  savePDF(doc, config);
};

const generateGridCatalog = async (data: Product[], options: ExportOptions, config: any, logoInfo: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const columns = 5;
  const colWidth = (pageWidth - (margin * 2)) / columns;
  const rowHeight = 55;
  
  const repeatHeader = config?.pdf_repeat_header !== false;
  const headerHeight = repeatHeader ? 65 : 20;
  const rowsPerPage = Math.floor((pageHeight - headerHeight - 10) / rowHeight);

  const imagesMap = new Map<string, string>();
  if (options.includeImages) {
    await fetchImagesInBatches(data, imagesMap, 300);
  }

  let currentX = margin;
  let currentY = 65;
  let itemCount = 0;

  addHeader(doc, config, logoInfo);

  for (let i = 0; i < data.length; i++) {
    const p = data[i];

    // Page Break Logic
    if (itemCount > 0 && itemCount % (columns * rowsPerPage) === 0) {
      doc.addPage();
      if (repeatHeader) {
        addHeader(doc, config, logoInfo);
        currentY = 65;
      } else {
        currentY = 20;
      }
      currentX = margin;
    }

    // 1. Draw Card Border (Dotted)
    doc.setDrawColor(200, 200, 200);
    (doc as any).setLineDash([1, 1], 0);
    doc.rect(currentX, currentY, colWidth, rowHeight);
    (doc as any).setLineDash([], 0);

    // 2. Brand (Top - Blue)
    doc.setTextColor(37, 99, 235); // Blue 600
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text(p.marca.toUpperCase(), currentX + 2, currentY + 4);

    // 3. Draw Image
    const base64 = imagesMap.get(p.id);
    if (base64) {
      const imgSize = colWidth - 6;
      doc.addImage(base64, 'JPEG', currentX + 3, currentY + 6, imgSize, imgSize * 0.7);
    }

    // 4. SKU Bar (Red - Platform Primary)
    doc.setFillColor(225, 29, 72); // #e11d48
    doc.rect(currentX, currentY + 31, colWidth, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(p.sku, currentX + 2, currentY + 34.5);

    // 5. Product Name
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    const nameLines = doc.splitTextToSize(p.nombre, colWidth - 4);
    doc.text(nameLines, currentX + 2, currentY + 40);

    // 6. Inputs (Quantity / Price) - Enlarged Price
    doc.setDrawColor(200, 200, 200);
    doc.rect(currentX + 2, currentY + 48, 6, 4); // Qty
    
    if (options.includePrice) {
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      const priceStr = `$${p.precio.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      doc.text(priceStr, currentX + 10, currentY + 52);
    }

    // Update coordinates
    itemCount++;
    if (itemCount % columns === 0) {
      currentX = margin;
      currentY += rowHeight;
    } else {
      currentX += colWidth;
    }
  }

  savePDF(doc, config);
};

const addHeader = (doc: jsPDF, config: any, logoInfo: any) => {
  const slogan = config?.pdf_slogan || '"CRECIENDO, LA RUTA HACIA LA EXCELENCIA AUTOMOTRIZ"';
  const advantages = config?.pdf_advantages || "Calidad garantizada\nMateriales resistentes\nDisponibilidad inmediata\nExcelente relación costo-beneficio";
  
  // 1. Logo (Top Right)
  if (logoInfo) {
    const targetHeight = 25; 
    const ratio = logoInfo.width / logoInfo.height;
    const targetWidth = targetHeight * ratio;
    
    const finalWidth = Math.min(targetWidth, 65);
    const finalHeight = finalWidth / ratio;
    
    doc.addImage(logoInfo.data, 'PNG', 196 - finalWidth, 8, finalWidth, finalHeight);
  }

  // 2. Company Name & Title (Top Left)
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text(config?.platform_name || 'TecnosisMX', 14, 20);
  
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(`CATÁLOGO DE PRODUCTOS - ${new Date().toLocaleDateString()}`, 14, 26);

  // 3. Two Columns Section (Advantages vs Slogan)
  // --- Left Column: Advantages ---
  let advY = 40;
  
  // Draw Custom Green Checkmark (Vector)
  doc.setDrawColor(22, 163, 74); // Green color
  doc.setLineWidth(0.8);
  const checkX = 14;
  const checkY = advY - 1;
  doc.line(checkX, checkY, checkX + 1.5, checkY + 1.5); // Short stroke
  doc.line(checkX + 1.5, checkY + 1.5, checkX + 4, checkY - 2); // Long stroke
  
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text("Ventajas de nuestros productos:", 19, advY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  
  const advantagesList = advantages.split('\n').filter((line: string) => line.trim() !== '');
  advY += 6;
  advantagesList.forEach((adv: string) => {
    doc.text(`•  ${adv}`, 22, advY);
    advY += 4.5;
  });

  // --- Right Column: Slogan ---
  const sloganX = 140; 
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bolditalic');
  
  const sloganLines = doc.splitTextToSize(slogan.startsWith('"') ? slogan : `"${slogan}"`, 70);
  doc.text(sloganLines, sloganX, 48, { align: 'center' });

  // 4. Divider line (Solid and clean)
  const finalHeaderY = Math.max(advY + 5, 62);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.5);
  doc.line(14, finalHeaderY, 196, finalHeaderY);
};

const fetchImagesInBatches = async (data: Product[], imagesMap: Map<string, string>, maxWidth = 200) => {
  toast.loading('Procesando imágenes...', { id: 'pdf-images' });
  const batchSize = 15;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await Promise.all(batch.map(async (p) => {
      if (p.imagenes && p.imagenes.length > 0) {
        try {
          const res = await getBase64ImageFromURL(p.imagenes[0], maxWidth);
          imagesMap.set(p.id, res.data);
        } catch (e) {}
      }
    }));
    const progress = Math.round((Math.min(i + batchSize, data.length) / data.length) * 100);
    toast.loading(`Procesando imágenes: ${progress}%`, { id: 'pdf-images' });
  }
  toast.dismiss('pdf-images');
};

const savePDF = (doc: jsPDF, config: any) => {
  const fileName = `Catalogo_${config?.platform_name?.replace(/\s+/g, '_') || 'TecnosisMX'}_${new Date().getTime()}.pdf`;
  doc.save(fileName);
};
