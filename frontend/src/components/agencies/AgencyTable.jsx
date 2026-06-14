import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import * as XLSX from 'xlsx';
import { Search, Phone, Mail, MessageCircle, Copy, Check, FilterX, Download, Send, Edit, ChevronDown, Upload } from 'lucide-react';
import AgencyDetailModal from './AgencyDetailModal';
import BulkEmailModal from './BulkEmailModal';
import BulkStatusModal from './BulkStatusModal';
import ImportModal from './ImportModal';

// A simple hook for copy to clipboard with feedback
function useCopyToClipboard() {
  const [copiedText, setCopiedText] = useState(null);

  const copy = useCallback(async (text) => {
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
  }, []);

  return [copiedText, copy];
}

export default function AgencyTable({ data }) {
  const [inputValue, setInputValue] = useState(''); // immediate UI state
  const [globalFilter, setGlobalFilter] = useState(''); // debounced filter applied to table
  const [columnFilters, setColumnFilters] = useState([]);
  const [copiedText, copy] = useCopyToClipboard();
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState({});

  // Debounce: Apply filter to table 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => setGlobalFilter(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

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
        id: 'select',
        size: 50,
        header: ({ table }) => (
          <input
            type="checkbox"
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
            />
          </div>
        )
      },
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
            </div>
          );
        }
      },
      {
        accessorKey: 'status',
        header: 'Durum',
        size: 130,
        filterFn: (row, columnId, filterValue) => {
          const val = row.getValue(columnId) || 'lead';
          return val === filterValue;
        },
        cell: info => {
          const status = info.getValue() || 'lead';
          if (status === 'contracted') {
            return <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">Sözleşmeli</span>;
          }
          if (status === 'contacted') {
            return <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">İletişime Geçildi</span>;
          }
          if (status === 'not_interested') {
            return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">İlgilenmiyor</span>;
          }
          if (status === 'blacklisted') {
            return <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">Kara Liste</span>;
          }
          return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">Potansiyel</span>;
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
                <>
                  <a 
                    href={`mailto:${email}`}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="E-posta Gönder (Mailto)"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                  <button 
                    onClick={() => copy(email)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="E-postayı Kopyala"
                  >
                    {copiedText === email ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </>
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
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
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
    setInputValue('');
    setGlobalFilter('');
    setColumnFilters([]);
  };

  const handleExportExcel = (filterType) => {
    if (data.length === 0) return;
    setIsExportMenuOpen(false);
    
    // Filtreleme
    let exportData = [];
    if (filterType === 'all_visible') {
      exportData = rows.map(r => r.original);
    } else {
      // Specific status export (ignoring current table filters, exporting from all data)
      exportData = data.filter(a => (a.status || 'lead') === filterType);
    }

    if (exportData.length === 0) {
      alert("Dışa aktarılacak kayıt bulunamadı.");
      return;
    }

    // 1. Liste Sayfası
    const sheetData = exportData.map(agency => ({
      'Belge No': agency.tursab_no || '',
      'Acente Adı': agency.name || '',
      'Durum': agency.status === 'contracted' ? 'Sözleşmeli' :
               agency.status === 'contacted' ? 'İletişime Geçildi' :
               agency.status === 'not_interested' ? 'İlgilenmiyor' :
               agency.status === 'blacklisted' ? 'Kara Liste' : 'Potansiyel',
      'Şehir': agency.city || '',
      'İlçe': agency.district || '',
      'Telefon': agency.phone || '',
      'E-posta': agency.email || '',
      'Adres': agency.address || '',
      'BTK': agency.btk || ''
    }));

    // 2. Özet İstatistikler Sayfası
    const stats = {
      'Toplam Kayıt': exportData.length,
      'Sözleşmeli': exportData.filter(a => a.status === 'contracted').length,
      'İletişime Geçildi': exportData.filter(a => a.status === 'contacted').length,
      'Potansiyel': exportData.filter(a => !a.status || a.status === 'lead').length,
      'İlgilenmiyor': exportData.filter(a => a.status === 'not_interested').length,
      'Kara Liste': exportData.filter(a => a.status === 'blacklisted').length,
    };
    const statsData = Object.entries(stats).map(([Metrik, Değer]) => ({ Metrik, Değer }));

    // Workbook oluştur
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(sheetData);
    const ws2 = XLSX.utils.json_to_sheet(statsData);

    // Sütun genişlikleri (Sheet 1)
    ws1['!cols'] = [
      { wch: 10 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 25 }, { wch: 50 }, { wch: 20 }
    ];

    XLSX.utils.book_append_sheet(wb, ws1, "Acente Listesi");
    XLSX.utils.book_append_sheet(wb, ws2, "İstatistikler");

    // İndir
    XLSX.writeFile(wb, `Acente_Listesi_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleUpdateStatus = (docId, newStatus) => {
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
          recipients={Object.keys(rowSelection).length > 0 
            ? table.getSelectedRowModel().rows.map(r => r.original)
            : rows.map(r => r.original)} 
          onClose={() => setIsBulkEmailOpen(false)} 
        />
      )}

      {isBulkStatusOpen && (
        <BulkStatusModal
          selectedAgencies={table.getSelectedRowModel().rows.map(r => r.original)}
          onClose={() => {
            setIsBulkStatusOpen(false);
            setRowSelection({});
          }}
        />
      )}

      {isImportModalOpen && (
        <ImportModal
          agenciesMap={useMemo(() => {
            const map = {};
            data.forEach(a => { if (a.tursab_no) map[String(a.tursab_no)] = a.docId; });
            return map;
          }, [data])}
          onClose={() => setIsImportModalOpen(false)}
        />
      )}

      {/* Filters Toolbar */}
      <div className="border-b border-slate-200 bg-slate-50/50 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              value={inputValue ?? ''}
              onChange={e => setInputValue(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:w-64"
              placeholder="Acente Adı veya Belge No..."
            />
              </div>

              <select
                value={table.getColumn('city')?.getFilterValue() ?? ''}
                onChange={e => table.getColumn('city')?.setFilterValue(e.target.value)}
                className="min-w-[140px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Tüm Şehirler</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>

              <select
                value={table.getColumn('district')?.getFilterValue() ?? ''}
                onChange={e => table.getColumn('district')?.setFilterValue(e.target.value)}
                className="min-w-[140px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20"
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
                className="max-w-[250px] min-w-[180px] truncate rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Tüm BTK'lar</option>
                {uniqueBtks.map(btk => (
                  <option key={btk} value={btk}>{btk}</option>
                ))}
              </select>

              <select
                value={table.getColumn('status')?.getFilterValue() ?? ''}
                onChange={e => table.getColumn('status')?.setFilterValue(e.target.value)}
                className="min-w-[150px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Tüm Durumlar</option>
                <option value="lead">Potansiyel</option>
                <option value="contacted">İletişime Geçildi</option>
                <option value="contracted">Sözleşmeli</option>
                <option value="not_interested">İlgilenmiyor</option>
                <option value="blacklisted">Kara Liste</option>
              </select>

              {(inputValue || columnFilters.length > 0) && (
                <button 
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <FilterX className="w-4 h-4" />
                  Temizle
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
              {Object.keys(rowSelection).length > 0 && (
                <button 
                  onClick={() => setIsBulkStatusOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
                >
                  <Edit className="w-4 h-4" />
                  <span className="hidden sm:inline">Toplu Durum ({Object.keys(rowSelection).length})</span>
                </button>
              )}

              <button 
                onClick={() => setIsBulkEmailOpen(true)}
                disabled={rows.length === 0}
                className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">
                  Toplu E-posta {Object.keys(rowSelection).length > 0 && `(${Object.keys(rowSelection).length})`}
                </span>
              </button>

              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">İçe Aktar</span>
              </button>

              <div className="relative">
                <button 
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  disabled={data.length === 0}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Excel'e Aktar</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {isExportMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)} />
                    <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-slate-200 bg-white py-2 shadow-lg">
                      <button onClick={() => handleExportExcel('all_visible')} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-600">
                        Tüm Görünür Kayıtlar ({rows.length})
                      </button>
                      <div className="my-1 h-px bg-slate-100" />
                      <button onClick={() => handleExportExcel('contracted')} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-600">
                        Sadece Sözleşmeliler
                      </button>
                      <button onClick={() => handleExportExcel('lead')} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-600">
                        Sadece Potansiyeller
                      </button>
                      <button onClick={() => handleExportExcel('contacted')} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-600">
                        Sadece İletişime Geçilenler
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Mobilde tabloyu yatay kaydırarak tüm kolonlara erişebilirsiniz.
            </p>
            <div className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-500">
              <span className="font-bold text-blue-600">{rows.length}</span> acente bulundu
            </div>
          </div>
        </div>
      </div>

      {/* Virtualized Table Body */}
      <div 
        ref={tableContainerRef} 
        className="relative flex-1 overflow-auto bg-white min-h-0"
      >
        <table className="min-w-[1050px] w-full border-collapse text-left table-fixed">
          <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="flex w-full">
                {headerGroup.headers.map(header => (
                  <th 
                    key={header.id} 
                    className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 flex items-center"
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
                      className="px-4 py-2 flex items-center text-sm text-slate-600 border-b border-transparent group-hover:border-blue-100 overflow-hidden"
                      style={{ width: cell.column.getSize() }}
                    >
                      {cell.column.id === 'actions' ? (
                        <div onClick={e => e.stopPropagation()} className="w-full">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      ) : (
                        <div className="w-full truncate">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
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
