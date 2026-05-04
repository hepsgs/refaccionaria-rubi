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

const getBase64ImageFromURL = (url: string, maxWidth = 200): Promise<string> => {
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
      const dataURL = canvas.toDataURL("image/jpeg", 0.6);
      resolve(dataURL);
    };
    img.onerror = (error) => reject(error);
    img.src = url;
  });
};

export const generateCatalogPDF = async (data: Product[], options: ExportOptions, config: any) => {
  if (options.template === 'grid') {
    return generateGridCatalog(data, options, config);
  } else {
    return generateTableCatalog(data, options, config);
  }
};

const generateTableCatalog = async (data: Product[], options: ExportOptions, config: any) => {
  const doc = new jsPDF();

  // Add Header
  await addHeader(doc, config);

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
    startY: 55,
    styles: { fontSize: 8, cellPadding: 3, font: 'helvetica', valign: 'middle' },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 55 },
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
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(`Página ${dataArg.pageNumber} de ${pageCount}`, 196, 285, { align: 'right' });
    },
    bodyStyles: options.includeImages ? { minCellHeight: 20 } : {}
  });

  savePDF(doc, config);
};

const generateGridCatalog = async (data: Product[], options: ExportOptions, config: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const columns = 5;
  const colWidth = (pageWidth - (margin * 2)) / columns;
  const rowHeight = 55;
  const rowsPerPage = Math.floor((pageHeight - 60) / rowHeight);

  const imagesMap = new Map<string, string>();
  if (options.includeImages) {
    await fetchImagesInBatches(data, imagesMap, 300); // Higher res for grid?
  }

  let currentX = margin;
  let currentY = 55;
  let itemCount = 0;

  await addHeader(doc, config);

  for (let i = 0; i < data.length; i++) {
    const p = data[i];

    // Page Break Logic
    if (itemCount > 0 && itemCount % (columns * rowsPerPage) === 0) {
      doc.addPage();
      await addHeader(doc, config);
      currentX = margin;
      currentY = 55;
    }

    // Draw Card Border (Dotted)
    doc.setDrawColor(200, 200, 200);
    (doc as any).setLineDash([1, 1], 0);
    doc.rect(currentX, currentY, colWidth, rowHeight);
    (doc as any).setLineDash([], 0);

    // Draw Image
    const base64 = imagesMap.get(p.id);
    if (base64) {
      const imgSize = colWidth - 6;
      doc.addImage(base64, 'JPEG', currentX + 3, currentY + 2, imgSize, imgSize * 0.7);
    }

    // SKU Bar (Green)
    doc.setFillColor(34, 197, 94); // emerald-500
    doc.rect(currentX, currentY + 30, colWidth, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(p.sku, currentX + 2, currentY + 33.5);

    // Product Info
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    const nameLines = doc.splitTextToSize(p.nombre, colWidth - 4);
    doc.text(nameLines, currentX + 2, currentY + 38);

    // Inputs (Quantity / Price)
    doc.setDrawColor(200, 200, 200);
    doc.rect(currentX + 2, currentY + 48, 6, 4); // Qty
    doc.rect(currentX + 10, currentY + 48, 15, 4); // Price
    doc.text('$', currentX + 11, currentY + 51);

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

const addHeader = async (doc: jsPDF, config: any) => {
  if (config?.logo_url) {
    try {
      const logoData = await getBase64ImageFromURL(config.logo_url);
      doc.addImage(logoData, 'PNG', 160, 10, 30, 15);
    } catch (e) {}
  }

  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text(config?.platform_name || 'TecnosisMX', 14, 20);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`CATÁLOGO DE PRODUCTOS - ${new Date().toLocaleDateString()}`, 14, 26);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 30, 196, 30);
};

const fetchImagesInBatches = async (data: Product[], imagesMap: Map<string, string>, maxWidth = 200) => {
  toast.loading('Procesando imágenes...', { id: 'pdf-images' });
  const batchSize = 15;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await Promise.all(batch.map(async (p) => {
      if (p.imagenes && p.imagenes.length > 0) {
        try {
          const base64 = await getBase64ImageFromURL(p.imagenes[0], maxWidth);
          imagesMap.set(p.id, base64);
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
