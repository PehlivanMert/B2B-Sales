import React, { useState, useMemo, useRef } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, MapPin, Phone, Mail, MessageCircle, Copy, Check, FilterX, Download, Send } from 'lucide-react';
import AgencyDetailModal from './AgencyDetailModal';
import BulkEmailModal from './BulkEmailModal';

// A simple hook for copy to clipboard with feedback
function useCopyToClipboard() {
  const [copiedText, setCopiedText] = useState(null);

  const copy = async (text) => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard not supported');
      return false;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
      return true;
    } catch (error) {
      console.warn('Copy failed', error);
      setCopiedText(null);
      return false;
    }
  };

  return [copiedText, copy];
}

export default function AgencyTable({ data }) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState([]);
  const [copiedText, copy] = useCopyToClipboard();
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);
  
  // Local state to optimistic update status without refetching 17k rows
  const [localStatuses, setLocalStatuses] = useState({});

  // Extract unique values for dropdowns
  const uniqueCities = useMemo(() => [...new Set(data.map(item => item.city).filter(Boolean))].sort(), [data]);
  const uniqueDistricts = useMemo(() => {
    const selectedCity = columnFilters.find(f => f.id === 'city')?.value;
    const filteredData = selectedCity ? data.filter(item => item.city === selectedCity) : data;
    return [...new Set(filteredData.map(item => item.district).filter(Boolean))].sort();
  }, [data, columnFilters]);
  const uniqueBtks = useMemo(() => [...new Set(data.map(item => item.btk).filter(Boolean))].sort(), [data]);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'tursab_no',
        header: 'Belge No',
        size: 100,
        cell: info => <span className="font-semibold text-slate-700">{info.getValue()}</span>
      },
      {
        accessorKey: 'name',
        header: 'Acente Adı',
        size: 300,
        cell: info => {
          const status = localStatuses[info.row.original.docId] || info.row.original.status || 'lead';
          const isContracted = status === 'contracted';
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium truncate block max-w-[230px]" title={info.getValue()}>
                {info.getValue()}
              </span>
              {info.row.original.is_active && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                  AKTİF
                </span>
              )}
              {isContracted && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
                  SÖZLEŞMELİ
                </span>
              )}
            </div>
          );
        }
      },
      {
        accessorKey: 'city',
        header: 'Şehir',
        size: 120,
        filterFn: 'equals'
      },
      {
        accessorKey: 'district',
        header: 'İlçe',
        size: 150,
        filterFn: 'equals'
      },
      {
        accessorKey: 'btk',
        header: 'BTK',
        size: 200,
        filterFn: 'equals',
        cell: info => <span className="text-xs text-slate-500 truncate block max-w-[180px]" title={info.getValue()}>{info.getValue()}</span>
      },
      {
        id: 'actions',
        header: 'Hızlı İşlemler',
        size: 200,
        cell: ({ row }) => {
          const { phone, email, name } = row.original;
          
          // Format phone for WhatsApp (e.g., remove spaces, add 90 if missing)
          const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
          const waPhone = cleanPhone.startsWith('0') ? '9' + cleanPhone : 
                         (cleanPhone.length === 10 ? '90' + cleanPhone : cleanPhone);
          const waMessage = encodeURIComponent(`Merhaba ${name} yetkilisi, `);

          return (
            <div className="flex items-center gap-1">
              {phone && (
                <>
                  <button 
                    onClick={() => copy(phone)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Telefonu Kopyala"
                  >
                    {copiedText === phone ? <Check className="w-4 h-4 text-emerald-500" /> : <Phone className="w-4 h-4" />}
                  </button>
                  {cleanPhone.length >= 10 && (
                    <a 
                      href={`https://wa.me/${waPhone}?text=${waMessage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                      title="WhatsApp'tan Yaz"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                </>
              )}
              {email && (
                <button 
                  onClick={() => copy(email)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="E-postayı Kopyala"
                >
                  {copiedText === email ? <Check className="w-4 h-4 text-emerald-500" /> : <Mail className="w-4 h-4" />}
                </button>
              )}
            </div>
          );
        }
      }
    ],
    [copiedText, copy]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
      columnFilters,
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const name = String(row.original.name || '').toLowerCase();
      const no = String(row.original.tursab_no || '').toLowerCase();
      return name.includes(search) || no.includes(search);
    }
  });

  const { rows } = table.getRowModel();

  // Virtualizer for smooth scrolling of 17k rows
  const tableContainerRef = useRef(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48, // approximate row height in px
    overscan: 10,
  });

  const clearFilters = () => {
    setGlobalFilter('');
    setColumnFilters([]);
  };

  const handleExportCSV = () => {
    if (rows.length === 0) return;
    
    // Define headers
    const headers = ['Belge No', 'Acente Adı', 'Şehir', 'İlçe', 'BTK', 'Telefon', 'E-posta'];
    
    // Map data
    const csvData = rows.map(row => {
      const { tursab_no, name, city, district, btk, phone, email } = row.original;
      return [
        tursab_no || '',
        `"${(name || '').replace(/"/g, '""')}"`,
        `"${(city || '').replace(/"/g, '""')}"`,
        `"${(district || '').replace(/"/g, '""')}"`,
        `"${(btk || '').replace(/"/g, '""')}"`,
        `"${(phone || '').replace(/"/g, '""')}"`,
        `"${(email || '').replace(/"/g, '""')}"`
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...csvData].join('\n');
    
    // Add BOM for Excel UTF-8 support
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Acente_Listesi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateStatus = (docId, newStatus) => {
    setLocalStatuses(prev => ({ ...prev, [docId]: newStatus }));
    
    // Also update selected agency if it's currently open
    if (selectedAgency && selectedAgency.docId === docId) {
      setSelectedAgency({ ...selectedAgency, status: newStatus });
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {selectedAgency && (
        <AgencyDetailModal 
          agency={selectedAgency} 
          onClose={() => setSelectedAgency(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {isBulkEmailOpen && (
        <BulkEmailModal 
          recipients={rows.map(r => r.original)} 
          onClose={() => setIsBulkEmailOpen(false)} 
        />
      )}

      {/* Filters Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64 bg-white"
              placeholder="Acente Adı veya Belge No..."
            />
          </div>

          <select
            value={table.getColumn('city')?.getFilterValue() ?? ''}
            onChange={e => table.getColumn('city')?.setFilterValue(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 bg-white min-w-[140px]"
          >
            <option value="">Tüm Şehirler</option>
            {uniqueCities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          <select
            value={table.getColumn('district')?.getFilterValue() ?? ''}
            onChange={e => table.getColumn('district')?.setFilterValue(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 bg-white min-w-[140px]"
            disabled={!table.getColumn('city')?.getFilterValue()}
          >
            <option value="">Tüm İlçeler</option>
            {uniqueDistricts.map(dist => (
              <option key={dist} value={dist}>{dist}</option>
            ))}
          </select>

          <select
            value={table.getColumn('btk')?.getFilterValue() ?? ''}
            onChange={e => table.getColumn('btk')?.setFilterValue(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 bg-white min-w-[180px] max-w-[250px] truncate"
          >
            <option value="">Tüm BTK'lar</option>
            {uniqueBtks.map(btk => (
              <option key={btk} value={btk}>{btk}</option>
            ))}
          </select>

          {(globalFilter || columnFilters.length > 0) && (
            <button 
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <FilterX className="w-4 h-4" />
              Temizle
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button 
              onClick={() => setIsBulkEmailOpen(true)}
              disabled={rows.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Toplu E-posta</span>
            </button>

            <button 
              onClick={handleExportCSV}
              disabled={rows.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Excel'e Aktar (CSV)</span>
            </button>
          </div>
        </div>
        
        <div className="text-sm font-medium text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          <span className="text-blue-600 font-bold">{rows.length}</span> acente bulundu
        </div>
      </div>

      {/* Virtualized Table Body */}
      <div 
        ref={tableContainerRef} 
        className="flex-1 overflow-auto relative bg-white"
      >
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th 
                    key={header.id} 
                    className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody 
            className="divide-y divide-slate-100 relative"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const row = rows[virtualRow.index];
              return (
                <tr 
                  key={row.id} 
                  onClick={() => setSelectedAgency(row.original)}
                  className="hover:bg-blue-50/50 transition-colors absolute w-full flex cursor-pointer"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {row.getVisibleCells().map(cell => (
                    <td 
                      key={cell.id} 
                      className="px-4 py-2 flex items-center text-sm text-slate-600 border-b border-transparent group-hover:border-blue-100"
                      style={{ width: cell.column.getSize() }}
                    >
                      {cell.column.id === 'actions' ? (
                        <div onClick={e => e.stopPropagation()}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      ) : (
                        flexRender(cell.column.columnDef.cell, cell.getContext())
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {rows.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
            <Search className="w-12 h-12 mb-3 text-slate-200" />
            <p>Arama kriterlerinize uygun acente bulunamadı.</p>
          </div>
        )}
      </div>
    </div>
  );
}
