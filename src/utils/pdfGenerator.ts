import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const getBase64ImageFromURL = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "anonymous");
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL("image/png");
      resolve(dataURL);
    };
    img.onerror = (error) => reject(error);
    img.src = url;
  });
};

export const generateOrderPDF = async (order: any, config: any) => {
  if (!order) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  // Header Section
  let headerY = 20;
  const platformName = config?.platform_name || 'Refaccionaria Rubi';
  
  if (config?.logo_url) {
    try {
      const logoData = await getBase64ImageFromURL(config.logo_url);
      doc.addImage(logoData, 'PNG', 14, 10, 25, 25);
      headerY = 35;
      
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.text(platformName, 45, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFont('helvetica', 'normal');
      doc.text('Detalle de Pedido', 45, 28);
    } catch (e) {
      console.error("Could not add logo to PDF", e);
      // Fallback if logo fails
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text(platformName, 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('Detalle de Pedido', 14, 28);
    }
  } else {
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text(platformName, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Detalle de Pedido', 14, 28);
  }

  // Order Info
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Información del Pedido', 14, headerY + 10);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Folio: ${order.folio || 'N/A'}`, 14, headerY + 18);
  doc.text(`Fecha: ${new Date(order.creado_at).toLocaleString('es-MX')}`, 14, headerY + 24);
  doc.text(`Estado: ${order.estatus.toUpperCase()}`, 14, headerY + 30);

  // Client Info (if available)
  const clientInfo = order.perfiles || {};
  if (clientInfo.nombre_completo) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente', 110, headerY + 10);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${clientInfo.nombre_completo}`, 110, headerY + 18);
    if (clientInfo.empresa) doc.text(`Empresa: ${clientInfo.empresa}`, 110, headerY + 24);
    if (order.cliente_id) doc.text(`ID Cliente: ${order.cliente_id.slice(0, 8)}...`, 110, headerY + 30);
  }

  // Items Table
  const tableColumn = ["SKU", "Producto", "Cant.", "P. Unitario", "Subtotal"];
  const tableRows = order.items.map((item: any) => [
    item.sku,
    item.nombre || 'N/A',
    item.cantidad.toString(),
    `$${item.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `$${(item.precio_unitario * item.cantidad).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: headerY + 40,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: headerY + 40 }
  });

  const finalY = (doc as any).lastAutoTable.finalY || headerY + 40;

  // Totals
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  const totalText = `Total del Pedido: $${order.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  doc.text(totalText, 196 - doc.getTextWidth(totalText), finalY + 15);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  const footerText = `${platformName} - Comprobante de pedido generado automáticamente.`;
  doc.text(footerText, 105, 285, { align: 'center' });

  doc.save(`Pedido_${order.folio || order.id.slice(0, 8)}.pdf`);
};
