import { useState, useEffect } from 'react';
import { DollarSign, FileText, Download, ChevronRight, ChevronDown } from 'lucide-react';
import jsPDF from 'jspdf';
import supabase from '../lib/SupabaseClient';

export default function BillingSimple() {
  const [unbilledData, setUnbilledData] = useState([]);
  const [expandedClients, setExpandedClients] = useState(new Set());
  const [selectedEntries, setSelectedEntries] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUnbilledTime();
  }, []);

  const loadUnbilledTime = async () => {
    setLoading(true);
    
    // Get all unbilled time entries with client info
    const { data: entries } = await supabase
      .from('time_entries')
      .select(`
        *,
        clients!inner(id, client_name, registration_number),
        consultants(first_name, last_name)
      `)
      .is('invoice_number', null)
      .eq('is_billable', true)
      .order('entry_date', { ascending: false });

    if (entries) {
      // Group by client
      const grouped = entries.reduce((acc, entry) => {
        const clientId = entry.clients.id;
        if (!acc[clientId]) {
          acc[clientId] = {
            client: entry.clients,
            entries: [],
            totalHours: 0,
            totalAmount: 0,
          };
        }
        acc[clientId].entries.push(entry);
        acc[clientId].totalHours += parseFloat(entry.duration_hours || 0);
        acc[clientId].totalAmount += parseFloat(entry.duration_hours || 0) * parseFloat(entry.hourly_rate || 0);
        return acc;
      }, {});

      setUnbilledData(Object.values(grouped));
    }
    
    setLoading(false);
  };

  const toggleClient = (clientId) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const toggleEntry = (entryId) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const selectAllForClient = (clientData) => {
    const newSelected = new Set(selectedEntries);
    const allSelected = clientData.entries.every(e => newSelected.has(e.id));
    
    if (allSelected) {
      // Deselect all
      clientData.entries.forEach(e => newSelected.delete(e.id));
    } else {
      // Select all
      clientData.entries.forEach(e => newSelected.add(e.id));
    }
    
    setSelectedEntries(newSelected);
  };

  const markAsInvoiced = async () => {
    if (selectedEntries.size === 0) {
      alert('Please select time entries to invoice');
      return;
    }

    const invoiceNumber = `INV-${Date.now()}`;
    const invoiceDate = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('time_entries')
      .update({
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        status: 'invoiced',
      })
      .in('id', Array.from(selectedEntries));

    if (!error) {
      alert(`${selectedEntries.size} entries marked as invoiced (${invoiceNumber})`);
      setSelectedEntries(new Set());
      loadUnbilledTime();
    } else {
      alert('Error creating invoice: ' + error.message);
    }
  };

  const exportToPDF = (clientData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth / 2, 20, { align: 'center' });
    
    // Client Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Client: ${clientData.client.client_name}`, 20, 40);
    if (clientData.client.registration_number) {
      doc.text(`Reg #: ${clientData.client.registration_number}`, 20, 47);
    }
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 54);
    
    // Table Header
    let yPos = 70;
    doc.setFont('helvetica', 'bold');
    doc.text('Date', 20, yPos);
    doc.text('Description', 50, yPos);
    doc.text('Hours', 140, yPos);
    doc.text('Rate', 160, yPos);
    doc.text('Amount', 180, yPos);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos + 2, 190, yPos + 2);
    
    // Table Rows
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    clientData.entries.forEach((entry) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      const date = new Date(entry.entry_date).toLocaleDateString('en-ZA');
      const hours = parseFloat(entry.duration_hours || 0).toFixed(2);
      const rate = parseFloat(entry.hourly_rate || 0).toFixed(2);
      const amount = (parseFloat(entry.duration_hours || 0) * parseFloat(entry.hourly_rate || 0)).toFixed(2);
      
      doc.text(date, 20, yPos);
      
      // Wrap description
      const description = entry.description || 'No description';
      const wrappedText = doc.splitTextToSize(description, 80);
      doc.text(wrappedText, 50, yPos);
      
      doc.text(hours, 140, yPos);
      doc.text(`R${rate}`, 160, yPos);
      doc.text(`R${amount}`, 180, yPos);
      
      yPos += Math.max(7, wrappedText.length * 5);
    });
    
    // Total
    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', 140, yPos);
    doc.text(`R${clientData.totalAmount.toFixed(2)}`, 180, yPos);
    
    // Save
    doc.save(`Invoice-${clientData.client.client_name}-${Date.now()}.pdf`);
  };

  const getTotalStats = () => {
    const totalClients = unbilledData.length;
    const totalHours = unbilledData.reduce((sum, c) => sum + c.totalHours, 0);
    const totalAmount = unbilledData.reduce((sum, c) => sum + c.totalAmount, 0);
    return { totalClients, totalHours, totalAmount };
  };

  const stats = getTotalStats();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">💰 Billing - Unbilled Time by Client</h1>
        <p className="text-gray-600">Create invoices for your clients</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Clients with Unbilled Time</p>
              <p className="text-3xl font-bold">{stats.totalClients}</p>
            </div>
            <FileText size={40} className="opacity-80" />
          </div>
        </div>
        
        <div className="bg-green-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">Total Unbilled Hours</p>
              <p className="text-3xl font-bold">{stats.totalHours.toFixed(1)}h</p>
            </div>
            <svg className="w-10 h-10 opacity-80" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
            </svg>
          </div>
        </div>
        
        <div className="bg-purple-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-1">Total Unbilled Amount</p>
              <p className="text-3xl font-bold">R {stats.totalAmount.toFixed(0)}</p>
            </div>
            <DollarSign size={40} className="opacity-80" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {selectedEntries.size > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="text-blue-900">
            <span className="font-semibold">{selectedEntries.size}</span> entries selected
          </div>
          <button
            onClick={markAsInvoiced}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
          >
            Mark as Invoiced
          </button>
        </div>
      )}

      {/* Clients List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Clients</h2>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500">
            Loading unbilled time...
          </div>
        ) : unbilledData.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-3 opacity-30" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
            </svg>
            <p>No unbilled time</p>
            <p className="text-sm mt-1">All time entries have been invoiced!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {unbilledData.map((clientData) => {
              const isExpanded = expandedClients.has(clientData.client.id);
              const allSelected = clientData.entries.every(e => selectedEntries.has(e.id));
              const someSelected = clientData.entries.some(e => selectedEntries.has(e.id));
              
              return (
                <div key={clientData.client.id}>
                  {/* Client Header */}
                  <div className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={() => toggleClient(clientData.client.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </button>
                        
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => selectAllForClient(clientData)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {clientData.client.client_name}
                          </h3>
                          {clientData.client.registration_number && (
                            <p className="text-sm text-gray-500 mt-1">
                              Reg: {clientData.client.registration_number}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right flex items-center gap-6">
                        <div>
                          <div className="text-sm text-gray-500">Hours</div>
                          <div className="text-xl font-bold text-gray-900">
                            {clientData.totalHours.toFixed(1)}h
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Amount</div>
                          <div className="text-xl font-bold text-green-600">
                            R {clientData.totalAmount.toFixed(2)}
                          </div>
                        </div>
                        <button
                          onClick={() => exportToPDF(clientData)}
                          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                        >
                          <Download size={16} />
                          PDF
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Time Entries */}
                  {isExpanded && (
                    <div className="bg-gray-50 px-6 py-4">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
                            <th className="pb-2 w-12"></th>
                            <th className="pb-2">Date</th>
                            <th className="pb-2">Consultant</th>
                            <th className="pb-2">Description</th>
                            <th className="pb-2 text-right">Hours</th>
                            <th className="pb-2 text-right">Rate</th>
                            <th className="pb-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {clientData.entries.map((entry) => (
                            <tr key={entry.id} className="border-b border-gray-200">
                              <td className="py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedEntries.has(entry.id)}
                                  onChange={() => toggleEntry(entry.id)}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="py-3">
                                {new Date(entry.entry_date).toLocaleDateString('en-ZA')}
                              </td>
                              <td className="py-3">
                                {entry.consultants?.first_name} {entry.consultants?.last_name}
                              </td>
                              <td className="py-3 text-gray-700">
                                {entry.description || 'No description'}
                              </td>
                              <td className="py-3 text-right font-semibold">
                                {parseFloat(entry.duration_hours || 0).toFixed(2)}
                              </td>
                              <td className="py-3 text-right">
                                R{parseFloat(entry.hourly_rate || 0).toFixed(2)}
                              </td>
                              <td className="py-3 text-right font-semibold text-green-600">
                                R{(parseFloat(entry.duration_hours || 0) * parseFloat(entry.hourly_rate || 0)).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
