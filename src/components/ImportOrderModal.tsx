import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, Download, AlertTriangle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';

interface ImportOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ProcessedItem {
  id: string;
  sku: string;
  nombre: string;
  precio: number;
  stock: number;
  requestedQuantity: number;
  effectiveQuantity: number;
  alreadyInCart: number;
  status: 'ok' | 'capped' | 'out_of_stock';
}

const normalizeKey = (key: string): string => {
  return key
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
};

const isPartNumberKey = (key: string): boolean => {
  const norm = normalizeKey(key);
  return (
    norm === 'noparte' ||
    norm === 'numerodeparte' ||
    norm === 'numparte' ||
    norm === 'sku' ||
    norm === 'parte' ||
    norm === 'codigo' ||
    norm === 'clave' ||
    norm === 'partnumber' ||
    norm.includes('parte') ||
    norm.includes('sku')
  );
};

const isQuantityKey = (key: string): boolean => {
  const norm = normalizeKey(key);
  return (
    norm === 'cantidad' ||
    norm === 'cant' ||
    norm === 'qty' ||
    norm === 'piezas' ||
    norm === 'pzs' ||
    norm === 'quantity' ||
    norm.includes('cant') ||
    norm.includes('qty')
  );
};

export const ImportOrderModal: React.FC<ImportOrderModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const [readyItems, setReadyItems] = useState<ProcessedItem[]>([]);
  const [outOfStockItems, setOutOfStockItems] = useState<ProcessedItem[]>([]);
  const [notFoundSkus, setNotFoundSkus] = useState<string[]>([]);
  const [hasProcessed, setHasProcessed] = useState(false);

  const { cart, addMultipleToCart } = useStore();

  if (!isOpen) return null;

  const resetState = () => {
    setFileName(null);
    setReadyItems([]);
    setOutOfStockItems([]);
    setNotFoundSkus([]);
    setHasProcessed(false);
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      { 'No Parte': 'EJEMPLO-001', 'Cantidad': 5 },
      { 'No Parte': 'EJEMPLO-002', 'Cantidad': 10 },
      { 'No Parte': 'EJEMPLO-003', 'Cantidad': 2 },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pedido');
    XLSX.writeFile(wb, 'plantilla_pedido_rubi.xlsx');
  };

  const processFile = async (file: File) => {
    setFileName(file.name);
    setLoading(true);
    setHasProcessed(false);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error('El archivo no contiene hojas de cálculo.');
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rawRows.length === 0) {
        throw new Error('El archivo está vacío.');
      }

      // Detect column keys
      const sampleRow = rawRows[0];
      const partKey = Object.keys(sampleRow).find(isPartNumberKey);
      const qtyKey = Object.keys(sampleRow).find(isQuantityKey);

      if (!partKey || !qtyKey) {
        throw new Error(
          'No se pudieron detectar las columnas requeridas. Asegurate de incluir "No Parte" y "Cantidad".'
        );
      }

      // Aggregate duplicate SKUs from file
      const requestedMap = new Map<string, number>();
      for (const row of rawRows) {
        const rawSku = String(row[partKey] || '').trim();
        const rawQty = Number(row[qtyKey]);

        if (rawSku && !isNaN(rawQty) && rawQty > 0) {
          const current = requestedMap.get(rawSku) || 0;
          requestedMap.set(rawSku, current + Math.floor(rawQty));
        }
      }

      if (requestedMap.size === 0) {
        throw new Error('No se encontraron filas con número de parte y cantidad válida.');
      }

      const skus = Array.from(requestedMap.keys());

      // Query products in batches of 200 to prevent URL length issues
      const batchSize = 200;
      const foundProducts: any[] = [];

      for (let i = 0; i < skus.length; i += batchSize) {
        const batch = skus.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('productos')
          .select('id, sku, nombre, precio, stock')
          .in('sku', batch);

        if (error) throw error;
        if (data) foundProducts.push(...data);
      }

      const foundSkuMap = new Map<string, any>();
      for (const prod of foundProducts) {
        foundSkuMap.set(prod.sku.toLowerCase(), prod);
      }

      const validList: ProcessedItem[] = [];
      const outList: ProcessedItem[] = [];
      const missingList: string[] = [];

      for (const [sku, requestedQty] of requestedMap.entries()) {
        const product = foundSkuMap.get(sku.toLowerCase());
        if (!product) {
          missingList.push(sku);
          continue;
        }

        const existingCartItem = cart.find((i) => i.id === product.id);
        const alreadyInCart = existingCartItem ? existingCartItem.cantidad : 0;
        const availableToAdd = Math.max(0, (product.stock || 0) - alreadyInCart);

        if (product.stock <= 0 || availableToAdd <= 0) {
          outList.push({
            id: product.id,
            sku: product.sku,
            nombre: product.nombre,
            precio: product.precio || 0,
            stock: product.stock || 0,
            requestedQuantity: requestedQty,
            effectiveQuantity: 0,
            alreadyInCart,
            status: 'out_of_stock',
          });
          continue;
        }

        const effectiveQuantity = Math.min(requestedQty, availableToAdd);
        const status = effectiveQuantity < requestedQty ? 'capped' : 'ok';

        validList.push({
          id: product.id,
          sku: product.sku,
          nombre: product.nombre,
          precio: product.precio || 0,
          stock: product.stock || 0,
          requestedQuantity: requestedQty,
          effectiveQuantity,
          alreadyInCart,
          status,
        });
      }

      setReadyItems(validList);
      setOutOfStockItems(outList);
      setNotFoundSkus(missingList);
      setHasProcessed(true);
    } catch (err: any) {
      console.error('Error processing order file:', err);
      toast.error(err.message || 'Error al procesar el archivo');
      resetState();
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleConfirmAdd = () => {
    if (readyItems.length === 0) return;

    const itemsToAdd = readyItems.map((item) => ({
      item: {
        id: item.id,
        sku: item.sku,
        nombre: item.nombre,
        precio: item.precio,
        stock: item.stock,
      },
      requestedQuantity: item.effectiveQuantity,
    }));

    addMultipleToCart(itemsToAdd);

    const totalPiezas = readyItems.reduce((acc, i) => acc + i.effectiveQuantity, 0);
    toast.success(`Se agregaron ${readyItems.length} productos (${totalPiezas} piezas) a tu pedido.`);

    onSuccess?.();
    onClose();
    resetState();
  };

  const totalPiezasAgregables = readyItems.reduce((acc, i) => acc + i.effectiveQuantity, 0);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-secondary/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 className="font-black text-secondary text-lg leading-tight uppercase tracking-tight">
                Importar Pedido desde Excel / CSV
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Cargá múltiples números de parte y cantidades automáticamente
              </p>
            </div>
          </div>
          <button
            onClick={() => { onClose(); resetState(); }}
            className="p-2 hover:bg-slate-200/60 rounded-full transition-colors text-slate-400 hover:text-secondary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-grow">
          {/* Instructions and Template download */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-bold text-secondary">Formato requerido del archivo:</p>
              <p>Columnas requeridas: <span className="font-semibold text-primary">No Parte</span> y <span className="font-semibold text-primary">Cantidad</span>.</p>
              <p className="text-[11px] text-slate-400">Formatos compatibles: .xlsx, .xls, .csv</p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center justify-center space-x-2 text-xs font-bold text-primary bg-white hover:bg-primary/5 border border-primary/20 px-3.5 py-2 rounded-xl transition-colors shrink-0 shadow-sm"
            >
              <Download size={14} />
              <span>Bajar Plantilla</span>
            </button>
          </div>

          {/* Upload Area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-primary bg-primary/5 scale-[0.99]'
                : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />
            {loading ? (
              <div className="flex flex-col items-center justify-center space-y-3 py-4">
                <Loader2 size={36} className="text-primary animate-spin" />
                <p className="text-sm font-bold text-secondary">Leyendo archivo y consultando catálogo...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <Upload size={28} />
                </div>
                <div>
                  <p className="text-sm font-bold text-secondary">
                    {fileName ? fileName : 'Hacé clic para seleccionar o arrastrá tu archivo aquí'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Soporta archivos Excel (.xlsx, .xls) o CSV</p>
                </div>
              </div>
            )}
          </div>

          {/* Results Summary */}
          {hasProcessed && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Ready */}
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <div className="flex items-center space-x-2 text-emerald-700 mb-1">
                    <CheckCircle2 size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Disponibles</span>
                  </div>
                  <p className="text-2xl font-black text-emerald-900 leading-none">{readyItems.length}</p>
                  <p className="text-[11px] text-emerald-700 font-medium mt-1">
                    {totalPiezasAgregables} piezas para agregar
                  </p>
                </div>

                {/* Out of Stock */}
                <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-2xl">
                  <div className="flex items-center space-x-2 text-amber-700 mb-1">
                    <AlertTriangle size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Sin Stock</span>
                  </div>
                  <p className="text-2xl font-black text-amber-900 leading-none">{outOfStockItems.length}</p>
                  <p className="text-[11px] text-amber-700 font-medium mt-1">Agotados o al tope</p>
                </div>

                {/* Not Found */}
                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl">
                  <div className="flex items-center space-x-2 text-rose-700 mb-1">
                    <AlertCircle size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">No Encontrados</span>
                  </div>
                  <p className="text-2xl font-black text-rose-900 leading-none">{notFoundSkus.length}</p>
                  <p className="text-[11px] text-rose-700 font-medium mt-1">No existen en catálogo</p>
                </div>
              </div>

              {/* Items Breakdown List */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {readyItems.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between hover:bg-white transition-colors">
                      <div className="space-y-0.5 pr-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-primary uppercase">{item.sku}</span>
                          {item.alreadyInCart > 0 && (
                            <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                              En carrito: {item.alreadyInCart}
                            </span>
                          )}
                          {item.status === 'capped' && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                              Ajustado a stock máx ({item.stock})
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 truncate max-w-sm">{item.nombre}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-secondary text-sm">+{item.effectiveQuantity}</span>
                        <p className="text-[10px] text-slate-400">Stock: {item.stock}</p>
                      </div>
                    </div>
                  ))}

                  {notFoundSkus.length > 0 && (
                    <div className="p-3 bg-rose-50/60">
                      <p className="font-bold text-rose-800 mb-1">Partes no encontradas:</p>
                      <p className="text-rose-600 font-mono text-[11px] break-all">
                        {notFoundSkus.join(', ')}
                      </p>
                    </div>
                  )}

                  {outOfStockItems.length > 0 && (
                    <div className="p-3 bg-amber-50/60">
                      <p className="font-bold text-amber-800 mb-1">Partes sin stock disponible:</p>
                      <p className="text-amber-700 text-[11px]">
                        {outOfStockItems.map((i) => `${i.sku} (${i.nombre})`).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <button
            type="button"
            onClick={() => { onClose(); resetState(); }}
            className="text-xs font-bold text-slate-500 hover:text-secondary uppercase tracking-wider px-4 py-3 rounded-xl transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!hasProcessed || readyItems.length === 0}
            onClick={handleConfirmAdd}
            className="btn-primary py-3 px-6 flex items-center space-x-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="font-black uppercase tracking-wider text-xs">
              {readyItems.length > 0
                ? `Agregar ${readyItems.length} Productos (${totalPiezasAgregables} pzs)`
                : 'Agregar al Pedido'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
