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
    margin: { top: repeatHeader ? 70 : 20, bottom: 40 },
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
      
      // Draw professional footer on all pages
      addFooter(doc, config, dataArg.pageNumber);
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
  const rowHeight = 46;
  
  const repeatHeader = config?.pdf_repeat_header !== false;
  const headerHeight = repeatHeader ? 65 : 20;
  const footerHeight = 35;
  const rowsPerPage = Math.floor((pageHeight - headerHeight - footerHeight - 10) / rowHeight);

  const imagesMap = new Map<string, string>();
  if (options.includeImages) {
    await fetchImagesInBatches(data, imagesMap, 300);
  }

  let currentX = margin;
  let currentY = 70;
  let itemCount = 0;
  let currentPageNum = 1;

  addHeader(doc, config, logoInfo);

  for (let i = 0; i < data.length; i++) {
    const p = data[i];

    // Page Break Logic
    if (itemCount > 0 && itemCount % (columns * rowsPerPage) === 0) {
      addFooter(doc, config, currentPageNum);
      doc.addPage();
      currentPageNum++;
      if (repeatHeader) {
        addHeader(doc, config, logoInfo);
        currentY = 70;
      } else {
        currentY = 20;
      }
      currentX = margin;
    }

    // 1. Draw Card Border (Dotted)
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    (doc as any).setLineDash([1, 1], 0);
    doc.rect(currentX, currentY, colWidth, rowHeight);
    (doc as any).setLineDash([], 0);

    // 2. Brand (Top - Blue)
    doc.setTextColor(37, 99, 235); // Blue 600
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(p.marca.toUpperCase(), currentX + 2, currentY + 3);

    // 3. Draw Image
    const base64 = imagesMap.get(p.id);
    if (base64) {
      doc.addImage(base64, 'JPEG', currentX + 6, currentY + 4.5, 26, 18.2);
    }

    // 4. SKU Bar (Red - Platform Primary)
    doc.setFillColor(225, 29, 72); // #e11d48
    doc.rect(currentX, currentY + 24, colWidth, 4.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(p.sku, currentX + 2, currentY + 27.3);

    // 5. Product Name
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    const nameLines = doc.splitTextToSize(p.nombre, colWidth - 4);
    doc.text(nameLines, currentX + 2, currentY + 32.5);

    // 6. Inputs (Quantity / Price) - Enlarged Price
    doc.setDrawColor(200, 200, 200);
    doc.rect(currentX + 2, currentY + 39.5, 5, 3.5); // Qty
    
    if (options.includePrice) {
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      const priceStr = `$${p.precio.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      doc.text(priceStr, currentX + 9, currentY + 42.5);
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

  // Draw footer on the last page of the grid catalog
  addFooter(doc, config, currentPageNum);

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
  const finalHeaderY = Math.max(advY + 2, 55);
  doc.setDrawColor(226, 232, 240); // slate-200 (lighter)
  doc.setLineWidth(0.3);
  doc.line(14, finalHeaderY, 196, finalHeaderY);
};

// --- Footer Utility & Helper Functions ---

const drawCircleCheck = (doc: jsPDF, x: number, y: number) => {
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.circle(x, y, 3);
  // Checkmark check lines
  doc.line(x - 1.2, y, x - 0.3, y + 1);
  doc.line(x - 0.3, y + 1, x + 1.5, y - 1.2);
};

const drawGear = (doc: jsPDF, x: number, y: number) => {
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.circle(x, y, 3);
  doc.circle(x, y, 1.1);
  // spokes
  for (let a = 0; a < 360; a += 45) {
    const rad = (a * Math.PI) / 180;
    doc.line(
      x + Math.cos(rad) * 1.1,
      y + Math.sin(rad) * 1.1,
      x + Math.cos(rad) * 3,
      y + Math.sin(rad) * 3
    );
  }
};

const drawBox = (doc: jsPDF, x: number, y: number) => {
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  // Isometric box lines
  doc.line(x, y - 1.5, x, y + 2);
  doc.line(x, y - 1.5, x - 2.5, y - 2.5);
  doc.line(x, y - 1.5, x + 2.5, y - 2.5);
  doc.line(x, y + 2, x - 2.5, y + 1);
  doc.line(x, y + 2, x + 2.5, y + 1);
  doc.line(x - 2.5, y - 2.5, x - 2.5, y + 1);
  doc.line(x + 2.5, y - 2.5, x + 2.5, y + 1);
  doc.line(x - 2.5, y - 2.5, x, y - 3.5);
  doc.line(x + 2.5, y - 2.5, x, y - 3.5);
};

const drawStar = (doc: jsPDF, x: number, y: number) => {
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  const points = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 3 : 1.2;
    const angle = (i * 36 * Math.PI) / 180 - Math.PI / 2;
    points.push({ x: x + r * Math.cos(angle), y: y + r * Math.sin(angle) });
  }
  for (let i = 0; i < 10; i++) {
    const next = (i + 1) % 10;
    doc.line(points[i].x, points[i].y, points[next].x, points[next].y);
  }
};

const addFooter = (doc: jsPDF, _config: any, pageNum: number) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Footer Main Background (deep navy slate-900)
  doc.setFillColor(15, 23, 42);
  doc.rect(0, pageHeight - 35, pageWidth, 35, 'F');

  // 2. Render 4 Columns with details
  const colWidth = 44;
  const colGap = 3.5;
  const startX = 12;

  const cols = [
    {
      title: "CALIDAD\nGARANTIZADA",
      desc: "Probados bajo estándares\nde alto rendimiento",
      drawIcon: drawCircleCheck
    },
    {
      title: "CALIDAD\nGARANTIZADA",
      desc: "Diseñados para ofrecer\nmáxima eficiencia",
      drawIcon: drawGear
    },
    {
      title: "ALTA\nDISPONIBILIDAD",
      desc: "Stock listo para\nentregas rápidas",
      drawIcon: drawBox
    },
    {
      title: "CONFIANZA QUE\nNOS RESPALDA",
      desc: "Soporte y respaldo\nen cada compra",
      drawIcon: drawStar
    }
  ];

  cols.forEach((col, idx) => {
    const colX = startX + idx * (colWidth + colGap);
    
    // Draw icon at center
    col.drawIcon(doc, colX + 4, pageHeight - 24);

    // Title (White, bold, 7.5pt)
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(col.title, colX + 10, pageHeight - 26.5);

    // Description (slate-300, normal, 5.5pt)
    doc.setTextColor(203, 213, 225);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.text(col.desc, colX + 10, pageHeight - 19.5);
  });

  // 3. Lower bottom bar
  doc.setFillColor(9, 15, 29);
  doc.rect(0, pageHeight - 9, pageWidth, 9, 'F');

  // 4. Red Slanted Chevron/Badge on the Left
  doc.setFillColor(225, 29, 72); // Red (#e11d48)
  doc.rect(0, pageHeight - 9, 45, 9, 'F');
  doc.triangle(45, pageHeight - 9, 50, pageHeight - 9, 45, pageHeight, 'F');

  // 5. Telephone text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`+52 961 608 8395`, 8, pageHeight - 3.2);

  // 6. Clean domain name text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('autopartesgml.com', pageWidth / 2 + 10, pageHeight - 3.5, { align: 'center' });

  // 7. Page Indicator
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175); // gray-400
  doc.text(`Pág. ${pageNum}`, pageWidth - 15, pageHeight - 3.5, { align: 'right' });
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
