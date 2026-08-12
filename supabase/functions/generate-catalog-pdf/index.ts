import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.2";

export const config = {
  verify_jwt: false
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

interface Product {
  id: string;
  sku: string;
  nombre: string;
  descripcion?: string;
  marca?: string;
  modelo?: string;
  año_inicio?: number;
  año_fin?: number;
  precio: number;
  stock: number;
  proveedor?: string;
  tipo?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch Configuration
    const { data: configData } = await supabase
      .from("configuracion")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    const config = configData || {};
    const platformName = config.platform_name || "Refaccionaria Rubi";
    const slogan = config.pdf_slogan || "Catálogo General de Productos";

    // 2. Fetch all products in batches
    let allProducts: Product[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .order("nombre", { ascending: true })
        .range(from, from + step - 1);

      if (error) throw error;
      if (data && data.length > 0) {
        allProducts = [...allProducts, ...data];
        if (data.length < step) hasMore = false;
        else from += step;
      } else {
        hasMore = false;
      }
    }

    // 3. Create PDF Document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header Title
    doc.setFillColor(15, 23, 42); // slate-900 header
    doc.rect(0, 0, pageWidth, 24, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(platformName.toUpperCase(), 14, 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(slogan, 14, 18);

    doc.setFontSize(8);
    const dateStr = `Actualizado: ${new Date().toLocaleDateString("es-MX")}`;
    doc.text(dateStr, pageWidth - 14, 15, { align: "right" });

    // Build Table
    const tableColumn = ["SKU", "Producto", "Marca"];
    if (config.show_modelo !== false) tableColumn.push("Modelo");
    tableColumn.push("Año", "Tipo");
    if (config.show_proveedor !== false) tableColumn.push("Proveedor");
    tableColumn.push("Precio");

    const tableRows = allProducts.map((p) => {
      const row: string[] = [
        String(p.sku || ""),
        p.nombre || "",
        p.marca || "-",
      ];

      if (config.show_modelo !== false) row.push(p.modelo || "-");

      const yearStr = p.año_inicio
        ? `${p.año_inicio}${p.año_fin ? ` - ${p.año_fin}` : ""}`
        : "-";
      row.push(yearStr);
      row.push(p.tipo || "-");

      if (config.show_proveedor !== false) row.push(p.proveedor || "-");

      const priceStr =
        p.precio !== undefined && p.precio !== null
          ? `$${Number(p.precio).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
          : "-";
      row.push(priceStr);

      return row;
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 28, left: 14, right: 14 },
    });

    // 4. Export PDF to ArrayBuffer
    const pdfArrayBuffer = doc.output("arraybuffer");
    const pdfBytes = new Uint8Array(pdfArrayBuffer);

    // 5. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("branding")
      .upload("catalogo_general.pdf", pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // 6. Update timestamp in DB
    const nowIso = new Date().toISOString();
    await supabase
      .from("configuracion")
      .update({ pdf_catalog_updated_at: nowIso })
      .eq("id", 1);

    console.log(`[generate-catalog-pdf] PDF successfully generated and uploaded at 3 AM CST (${nowIso}). Total products: ${allProducts.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Catálogo PDF generado exitosamente con ${allProducts.length} productos.`,
        updated_at: nowIso,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[generate-catalog-pdf] Error generating PDF:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
