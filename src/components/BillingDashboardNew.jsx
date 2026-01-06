import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, Clock, Download, ChevronDown, ChevronRight, Calendar, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';

export default function BillingDashboardNew() {
  const [customers, setCustomers] = useState([]);
  const [expandedCustomers, setExpandedCustomers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);

  useEffect(() => {
    loadCustomersWithUnbilledTime();
  }, []);

  const loadCustomersWithUnbilledTime = async () => {
    setLoading(true);
    try {
      // Get all unbilled time entries with client and project info
      const { data: timeEntries, error } = await supabase
        .from('time_entries')
        .select(`
          id,
          entry_date,
          duration_hours,
          description,
          hourly_rate,
          status,
          project_id,
          consultant_id,
          projects!inner (
            id,
            name,
            project_number,
            hourly_rate,
            client_id,
            clients!inner (
              id,
              client_name,
              email
            )
          ),
          consultants (
            id,
            full_name
          )
        `)
        .neq('status', 'invoiced')
        .order('entry_date', { ascending: false });

      if (error) throw error;

      // Group by customer
      const customerMap = {};
      
      timeEntries?.forEach(entry => {
        const client = entry.projects.clients;
        const project = entry.projects;
        
        if (!customerMap[client.id]) {
          customerMap[client.id] = {
            id: client.id,
            name: client.client_name,
            email: client.email,
            totalHours: 0,
            totalAmount: 0,
            projects: {}
          };
        }

        // Add to project
        if (!customerMap[client.id].projects[project.id]) {
          customerMap[client.id].projects[project.id] = {
            id: project.id,
            name: project.name,
            number: project.project_number,
            hours: 0,
            amount: 0,
            entries: []
          };
        }

        const entryHours = entry.duration_hours || 0;
        const entryRate = entry.hourly_rate || project.hourly_rate || 0;
        const entryAmount = entryHours * entryRate;

        customerMap[client.id].totalHours += entryHours;
        customerMap[client.id].totalAmount += entryAmount;
        customerMap[client.id].projects[project.id].hours += entryHours;
        customerMap[client.id].projects[project.id].amount += entryAmount;
        customerMap[client.id].projects[project.id].entries.push(entry);
      });

      // Convert to array and sort by amount (highest first)
      const customersArray = Object.values(customerMap)
        .map(customer => ({
          ...customer,
          projects: Object.values(customer.projects)
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);

      setCustomers(customersArray);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCustomer = (customerId) => {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
    }
    setExpandedCustomers(newExpanded);
  };

  const handleCreateInvoice = async (customer, selectedProjectIds = null) => {
    const invoiceNumber = prompt('Enter invoice number:');
    if (!invoiceNumber) return;

    try {
      const invoiceDate = new Date().toISOString().split('T')[0];
      
      // Determine which projects to invoice
      const projectsToInvoice = selectedProjectIds 
        ? customer.projects.filter(p => selectedProjectIds.includes(p.id))
        : customer.projects;

      // Mark all entries as invoiced
      for (const project of projectsToInvoice) {
        for (const entry of project.entries) {
          await supabase
            .from('time_entries')
            .update({
              status: 'invoiced',
              invoice_number: invoiceNumber,
              invoice_date: invoiceDate
            })
            .eq('id', entry.id);
        }
      }

      // Reload data
      await loadCustomersWithUnbilledTime();
      alert(`Invoice ${invoiceNumber} created successfully!`);
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice. Please try again.');
    }
  };

  const exportCustomerJobCard = (customer) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE SUMMARY', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Customer Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Customer: ${customer.name}`, 20, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    if (customer.email) {
      doc.text(`Email: ${customer.email}`, 20, yPos);
      yPos += 7;
    }
    yPos += 5;

    // Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 20, yPos);
    yPos += 8;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Hours: ${customer.totalHours.toFixed(2)}h`, 20, yPos);
    yPos += 6;
    doc.text(`Total Amount: R ${customer.totalAmount.toFixed(2)}`, 20, yPos);
    yPos += 6;
    doc.text(`Number of Projects: ${customer.projects.length}`, 20, yPos);
    yPos += 12;

    // Projects breakdown
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Projects Breakdown', 20, yPos);
    yPos += 10;

    customer.projects.forEach((project, idx) => {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      // Project header
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(59, 130, 246);
      doc.rect(20, yPos - 5, pageWidth - 40, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(`${project.name} (${project.number || 'N/A'})`, 22, yPos);
      doc.text(`${project.hours.toFixed(2)}h - R ${project.amount.toFixed(2)}`, pageWidth - 22, yPos, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      yPos += 10;

      // Time entries
      doc.setFontSize(10);
      const entriesByDate = project.entries.reduce((acc, entry) => {
        const date = entry.entry_date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(entry);
        return acc;
      }, {});

      Object.keys(entriesByDate).sort().reverse().forEach(date => {
        const entries = entriesByDate[date];
        
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.text(new Date(date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }), 25, yPos);
        yPos += 5;

        entries.forEach(entry => {
          if (yPos > 275) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFont('helvetica', 'normal');
          doc.text(`${entry.consultants?.full_name || 'Unknown'}`, 30, yPos);
          doc.text(`${entry.duration_hours?.toFixed(2)}h`, pageWidth - 22, yPos, { align: 'right' });
          yPos += 5;

          if (entry.description) {
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            const descLines = doc.splitTextToSize(entry.description, pageWidth - 60);
            doc.text(descLines, 30, yPos);
            yPos += descLines.length * 4;
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
          }
          yPos += 3;
        });

        yPos += 5;
      });

      yPos += 5;
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated: ${new Date().toLocaleString('en-ZA')}`, 20, doc.internal.pageSize.getHeight() - 10);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    }

    const fileName = `Invoice_${customer.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-green-600" />
            Billing - Unbilled Time by Customer
          </h1>
          <p className="text-gray-600 mt-1">Create invoices for your customers</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Customers with Unbilled Time</p>
              <p className="text-3xl font-bold mt-2">{customers.length}</p>
            </div>
            <FileText className="w-12 h-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Unbilled Hours</p>
              <p className="text-3xl font-bold mt-2">
                {customers.reduce((sum, c) => sum + c.totalHours, 0).toFixed(1)}h
              </p>
            </div>
            <Clock className="w-12 h-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Total Unbilled Amount</p>
              <p className="text-3xl font-bold mt-2">
                R {customers.reduce((sum, c) => sum + c.totalAmount, 0).toFixed(0)}
              </p>
            </div>
            <DollarSign className="w-12 h-12 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Customers List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customers</h2>
          
          {customers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No unbilled time</p>
              <p className="text-sm mt-2">All time entries have been invoiced!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customers.map((customer) => {
                const isExpanded = expandedCustomers.has(customer.id);
                
                return (
                  <div key={customer.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Customer Header */}
                    <div 
                      className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleCustomer(customer.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                          <div>
                            <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                            <p className="text-sm text-gray-600">
                              {customer.projects.length} project{customer.projects.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-blue-600">
                              {customer.totalHours.toFixed(1)}h
                            </p>
                            <p className="text-sm text-gray-500">
                              R {customer.totalAmount.toFixed(2)}
                            </p>
                          </div>
                          
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => exportCustomerJobCard(customer)}
                              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                            >
                              <Download className="w-4 h-4" />
                              PDF
                            </button>
                            <button
                              onClick={() => handleCreateInvoice(customer)}
                              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
                            >
                              <FileText className="w-4 h-4" />
                              Create Invoice
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Projects Breakdown (Expanded) */}
                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-gray-200">
                        <div className="space-y-3">
                          {customer.projects.map((project) => (
                            <div key={project.id} className="bg-gray-50 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className="font-medium text-gray-900">{project.name}</h4>
                                  <p className="text-xs text-gray-500">{project.number || 'No project number'}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-blue-600">{project.hours.toFixed(2)}h</p>
                                  <p className="text-sm text-gray-600">R {project.amount.toFixed(2)}</p>
                                </div>
                              </div>
                              
                              {/* Time Entries */}
                              <div className="space-y-2 mt-3 border-t border-gray-200 pt-3">
                                {project.entries.slice(0, 5).map((entry, idx) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-3 h-3 text-gray-400" />
                                      <span className="text-gray-600">
                                        {new Date(entry.entry_date).toLocaleDateString('en-ZA')}
                                      </span>
                                      <span className="text-gray-400">•</span>
                                      <User className="w-3 h-3 text-gray-400" />
                                      <span className="text-gray-600">
                                        {entry.consultants?.full_name || 'Unknown'}
                                      </span>
                                    </div>
                                    <span className="font-medium text-gray-900">
                                      {entry.duration_hours?.toFixed(2)}h
                                    </span>
                                  </div>
                                ))}
                                {project.entries.length > 5 && (
                                  <p className="text-xs text-gray-500 italic mt-2">
                                    +{project.entries.length - 5} more entries...
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
