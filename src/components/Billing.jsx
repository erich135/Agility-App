import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, Download, ChevronRight, ChevronDown, Check } from 'lucide-react';
import jsPDF from 'jspdf';
import supabase from '../lib/SupabaseClient';

export default function Billing() {
  const [unbilledData, setUnbilledData] = useState([]);
  const [expandedClients, setExpandedClients] = useState(new Set());
  const [selectedEntries, setSelectedEntries] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0]
  });
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewClient, setPreviewClient] = useState(null);

  useEffect(() => {
    loadUnbilledTime();
  }, []);

  const loadUnbilledTime = async () => {
    setLoading(true);
    
    const { data: entries } = await supabase
      .from('time_entries')
      .select(`
        *,
        clients(id, client_name, registration_number),
        consultants(full_name),
        job_types(name)
      `)
      .eq('is_invoiced', false)
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
        acc[clientId].totalHours += parseFloat(entry.hours || 0);
        acc[clientId].totalAmount += parseFloat(entry.hours || 0) * parseFloat(entry.hourly_rate || 0);
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
      clientData.entries.forEach(e => newSelected.delete(e.id));
    } else {
      clientData.entries.forEach(e => newSelected.add(e.id));
    }
    
    setSelectedEntries(newSelected);
  };

  const openInvoiceModal = () => {
    if (selectedEntries.size === 0) {
      alert('Please select time entries to mark as invoiced');
      return;
    }
    setShowInvoiceModal(true);
  };

  const markAsInvoiced = async () => {
    if (!invoiceDetails.invoiceNumber.trim()) {
      alert('Please enter an invoice number');
      return;
    }

    const { error } = await supabase
      .from('time_entries')
      .update({
        invoice_number: invoiceDetails.invoiceNumber,
        invoice_date: invoiceDetails.invoiceDate,
        is_invoiced: true,
      })
      .in('id', Array.from(selectedEntries));

    if (!error) {
      alert(`✅ Marked as invoiced: ${invoiceDetails.invoiceNumber}\n${selectedEntries.size} entries updated`);
      setSelectedEntries(new Set());
      setShowInvoiceModal(false);
      setInvoiceDetails({
        invoiceNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0]
      });
      loadUnbilledTime();
    } else {
      alert('❌ Error: ' + error.message);
    }
  };

  const openPreview = (clientData) => {
    setPreviewClient(clientData);
    setShowPreviewModal(true);
  };

  const exportToPDF = (clientData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Company Header with Blue Background
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('AGILITY CONSULTANTS', pageWidth / 2, 18, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Professional Accounting & Tax Services', pageWidth / 2, 26, { align: 'center' });
    doc.text('Email: info@agilityconsultants.co.za | Phone: +27 (0)11 123 4567', pageWidth / 2, 32, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    
    // Report Title
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('UNBILLED TIME REPORT', 20, 55);
    doc.setTextColor(0, 0, 0);
    
    // Report Details
    const reportDate = new Date().toLocaleDateString('en-ZA');
    const periodStart = clientData.entries.length > 0 
      ? new Date(Math.min(...clientData.entries.map(e => new Date(e.entry_date)))).toLocaleDateString('en-ZA')
      : reportDate;
    const periodEnd = clientData.entries.length > 0
      ? new Date(Math.max(...clientData.entries.map(e => new Date(e.entry_date)))).toLocaleDateString('en-ZA')
      : reportDate;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Report Date:', 20, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(reportDate, 60, 70);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Period:', 20, 77);
    doc.setFont('helvetica', 'normal');
    doc.text(`${periodStart} - ${periodEnd}`, 60, 77);
    
    // Customer Info
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENT:', 120, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(clientData.client.client_name, 120, 77);
    if (clientData.client.registration_number) {
      doc.text(`Reg #: ${clientData.client.registration_number}`, 120, 84);
    }
    
    // Table Header with Background
    let yPos = 100;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos - 5, 170, 8, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Date', 22, yPos);
    doc.text('Consultant', 45, yPos);
    doc.text('Job Type', 75, yPos);
    doc.text('Description', 105, yPos);
    doc.text('Hours', 150, yPos, { align: 'right' });
    doc.text('Rate', 165, yPos, { align: 'right' });
    doc.text('Amount', 185, yPos, { align: 'right' });
    
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos + 2, 190, yPos + 2);
    
    // Table Rows
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    clientData.entries.forEach((entry, index) => {
      if (yPos > 260) {
        doc.addPage();
        
        // Repeat header on new page
        yPos = 20;
        doc.setFillColor(240, 240, 240);
        doc.rect(20, yPos - 5, 170, 8, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Date', 22, yPos);
        doc.text('Consultant', 45, yPos);
        doc.text('Job Type', 75, yPos);
        doc.text('Description', 105, yPos);
        doc.text('Hours', 150, yPos, { align: 'right' });
        doc.text('Rate', 165, yPos, { align: 'right' });
        doc.text('Amount', 185, yPos, { align: 'right' });
        doc.line(20, yPos + 2, 190, yPos + 2);
        yPos += 10;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
      }
      
      // Alternating row colors
      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(20, yPos - 5, 170, 7, 'F');
      }
      
      const date = new Date(entry.entry_date).toLocaleDateString('en-ZA');
      const consultant = entry.consultants?.full_name || 'N/A';
      const jobType = entry.job_types?.name || 'Service';
      const description = (entry.description || '').substring(0, 25);
      const hours = parseFloat(entry.hours || 0).toFixed(2);
      const rate = parseFloat(entry.hourly_rate || 0).toFixed(2);
      const amount = (parseFloat(entry.hours || 0) * parseFloat(entry.hourly_rate || 0)).toFixed(2);
      
      doc.text(date, 22, yPos);
      doc.text(consultant.substring(0, 15), 45, yPos);
      doc.text(jobType.substring(0, 15), 75, yPos);
      doc.text(description, 105, yPos);
      doc.text(hours, 150, yPos, { align: 'right' });
      doc.text(`R${rate}`, 165, yPos, { align: 'right' });
      doc.text(`R${amount}`, 185, yPos, { align: 'right' });
      
      yPos += 7;
    });
    
    // Totals Section
    yPos += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, 190, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    // Total Hours
    doc.text('Total Hours:', 120, yPos);
    doc.text(`${clientData.totalHours.toFixed(2)}h`, 150, yPos, { align: 'right' });
    
    yPos += 7;
    // Total Amount (Excl VAT)
    doc.text('Total (Excl VAT):', 120, yPos);
    doc.text(`R${clientData.totalAmount.toFixed(2)}`, 185, yPos, { align: 'right' });
    
    yPos += 7;
    // VAT Amount
    const vat = clientData.totalAmount * 0.15;
    doc.text('VAT (15%):', 120, yPos);
    doc.text(`R${vat.toFixed(2)}`, 185, yPos, { align: 'right' });
    
    // Grand Total with Background
    yPos += 10;
    doc.setFillColor(37, 99, 235);
    doc.rect(110, yPos - 6, 80, 10, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('Total (Incl VAT):', 120, yPos);
    doc.text(`R${(clientData.totalAmount + vat).toFixed(2)}`, 185, yPos, { align: 'right' });
    
    doc.setTextColor(0, 0, 0);
    
    // Footer Note
    yPos += 20;
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('This is an unbilled time report for your records. Please use this information to create', 20, yPos);
    doc.text('an invoice in your Pastel Partner system.', 20, yPos + 5);
    
    // Footer
    doc.setFillColor(240, 240, 240);
    doc.rect(0, 285, 210, 12, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Report generated on ${reportDate}`, pageWidth / 2, 291, { align: 'center' });
    
    doc.save(`Unbilled_Time_${clientData.client.client_name.replace(/\s+/g, '_')}_${reportDate.replace(/\//g, '-')}.pdf`);
  };

  const getTotalStats = () => {
    const totalClients = unbilledData.length;
    const totalHours = unbilledData.reduce((sum, c) => sum + c.totalHours, 0);
    const totalAmount = unbilledData.reduce((sum, c) => sum + c.totalAmount, 0);
    return { totalClients, totalHours, totalAmount };
  };

  const stats = getTotalStats();
  const selectedTotal = Array.from(selectedEntries).reduce((sum, id) => {
    const entry = unbilledData.flatMap(c => c.entries).find(e => e.id === id);
    if (entry) {
      return sum + (parseFloat(entry.hours || 0) * parseFloat(entry.hourly_rate || 0));
    }
    return sum;
  }, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">💰 Billing Dashboard</h1>
        <p className="text-gray-600">Review and invoice unbilled time</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-500 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Customers with Unbilled Time</p>
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

      {/* Selection Actions */}
      {selectedEntries.size > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="text-blue-900">
            <span className="font-semibold">{selectedEntries.size}</span> entries selected
            <span className="ml-4 text-blue-700">Total: R {selectedTotal.toFixed(2)}</span>
          </div>
          <button
            onClick={openInvoiceModal}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2"
          >
            <Check size={18} />
            Mark as Invoiced
          </button>
        </div>
      )}

      {/* Customers List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Customers</h2>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500">
            Loading unbilled time...
          </div>
        ) : unbilledData.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <Check size={48} className="mx-auto mb-3 text-green-500" />
            <p className="font-semibold">All caught up!</p>
            <p className="text-sm mt-1">No unbilled time entries</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {unbilledData.map((clientData) => {
              const isExpanded = expandedClients.has(clientData.client.id);
              const allSelected = clientData.entries.every(e => selectedEntries.has(e.id));
              
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
                          <p className="text-sm text-gray-500">
                            {clientData.entries.length} entries
                          </p>
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
                        <div className="flex gap-2">
                          <button
                            onClick={() => openPreview(clientData)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                            title="Preview Report"
                          >
                            <FileText size={16} />
                            Preview
                          </button>
                          <button
                            onClick={() => exportToPDF(clientData)}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                            title="Export to PDF"
                          >
                            <Download size={16} />
                            PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Time Entries */}
                  {isExpanded && (
                    <div className="bg-gray-50 px-6 py-4">
                      <table className="w-full text-sm">
                        <thead className="text-left text-gray-600 border-b border-gray-200">
                          <tr>
                            <th className="pb-2 w-12"></th>
                            <th className="pb-2">Date</th>
                            <th className="pb-2">Consultant</th>
                            <th className="pb-2">Job Type</th>
                            <th className="pb-2">Description</th>
                            <th className="pb-2 text-right">Hours</th>
                            <th className="pb-2 text-right">Rate</th>
                            <th className="pb-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clientData.entries.map((entry) => (
                            <tr key={entry.id} className="border-b border-gray-200">
                              <td className="py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedEntries.has(entry.id)}
                                  onChange={() => toggleEntry(entry.id)}
                                  className="w-4 h-4 text-blue-600 rounded"
                                />
                              </td>
                              <td className="py-3">
                                {new Date(entry.entry_date).toLocaleDateString('en-ZA')}
                              </td>
                              <td className="py-3">
                                {entry.consultants?.first_name} {entry.consultants?.last_name}
                              </td>
                              <td className="py-3">
                                {entry.job_types?.name || '-'}
                              </td>
                              <td className="py-3 text-gray-700">
                                {entry.description || 'No description'}
                              </td>
                              <td className="py-3 text-right font-semibold">
                                {parseFloat(entry.hours || 0).toFixed(2)}
                              </td>
                              <td className="py-3 text-right">
                                R{parseFloat(entry.hourly_rate || 0).toFixed(2)}
                              </td>
                              <td className="py-3 text-right font-semibold text-green-600">
                                R{(parseFloat(entry.hours || 0) * parseFloat(entry.hourly_rate || 0)).toFixed(2)}
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

      {/* Mark as Invoiced Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Mark as Invoiced</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Pastel Invoice Number *
              </label>
              <input
                type="text"
                placeholder="e.g., INV-2026-001"
                value={invoiceDetails.invoiceNumber}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, invoiceNumber: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDetails.invoiceDate}
                onChange={(e) => setInvoiceDetails({...invoiceDetails, invoiceDate: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="text-sm text-gray-600 mb-6 bg-blue-50 p-3 rounded">
              <p className="font-semibold">Summary:</p>
              <p>{selectedEntries.size} time entries will be marked as invoiced</p>
              <p>Total: R {selectedTotal.toFixed(2)}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={markAsInvoiced}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Report Modal */}
      {showPreviewModal && previewClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 my-8">
            <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
              <h3 className="text-xl font-bold">Unbilled Time Report</h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto">
              {/* Client Info */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Client</p>
                  <p className="font-semibold text-lg">{previewClient.client.client_name}</p>
                  {previewClient.client.registration_number && (
                    <p className="text-sm text-gray-600">Reg #: {previewClient.client.registration_number}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Report Date</p>
                  <p className="font-semibold">{new Date().toLocaleDateString('en-ZA')}</p>
                </div>
              </div>

              {/* Time Entries Table */}
              <div className="border rounded-lg overflow-hidden mb-6">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Consultant</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Job Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Hours</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Rate</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {previewClient.entries.map((entry, index) => (
                      <tr key={entry.id} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          {new Date(entry.entry_date).toLocaleDateString('en-ZA')}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{entry.consultants?.full_name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{entry.job_types?.name || 'Service'}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="whitespace-pre-wrap text-gray-700">{entry.description}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold whitespace-nowrap">
                          {parseFloat(entry.hours || 0).toFixed(2)}h
                        </td>
                        <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                          R{parseFloat(entry.hourly_rate || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-green-600 whitespace-nowrap">
                          R{(parseFloat(entry.hours || 0) * parseFloat(entry.hourly_rate || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">Total Hours:</span>
                  <span className="text-lg font-bold">{previewClient.totalHours.toFixed(2)}h</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">Total (Excl VAT):</span>
                  <span className="text-lg font-bold">R{previewClient.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold">VAT (15%):</span>
                  <span className="text-lg font-bold">R{(previewClient.totalAmount * 0.15).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t-2 border-blue-600">
                  <span className="text-xl font-bold">Total (Incl VAT):</span>
                  <span className="text-2xl font-bold text-blue-600">
                    R{(previewClient.totalAmount * 1.15).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    exportToPDF(previewClient);
                    setShowPreviewModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
