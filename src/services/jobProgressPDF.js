import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
applyPlugin(jsPDF);

/**
 * Generate a professional Progress Report PDF for a job.
 * @param {Object} params
 * @param {Object} params.job - The job record
 * @param {string} params.customerName - Customer / client name
 * @param {Array}  params.checklistItems - Checklist items for this job
 * @param {Object} params.statusConfig - { key: { label } } map
 * @param {Object} params.categoryConfig - { key: { label } } map
 */
export function generateProgressReportPDF({
  job,
  customerName,
  checklistItems = [],
  statusConfig = {},
  categoryConfig = {},
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Colors
  const brandBlue = [37, 99, 235];   // #2563eb
  const darkGray = [31, 41, 55];     // #1f2937
  const medGray = [107, 114, 128];   // #6b7280
  const lightGray = [229, 231, 235]; // #e5e7eb
  const green = [34, 197, 94];       // #22c55e
  const red = [239, 68, 68];         // #ef4444

  // ---- Header Bar ----
  doc.setFillColor(...brandBlue);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Progress Report', margin, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-ZA')}`, pageWidth - margin, 12, { align: 'right' });

  // Customer name in header
  doc.setFontSize(11);
  doc.text(customerName || 'Unknown Client', margin, 22);

  y = 36;

  // ---- Job Title & Status Row ----
  doc.setTextColor(...darkGray);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(job.title || 'Untitled Job', margin, y);
  y += 2;

  const statusLabel = statusConfig[job.status]?.label || job.status;
  const catLabel = categoryConfig[job.category]?.label || job.category;

  // Status badge (right-aligned)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const statusTextWidth = doc.getTextWidth(statusLabel);
  const badgeX = pageWidth - margin - statusTextWidth - 6;
  doc.setFillColor(230, 240, 255);
  doc.roundedRect(badgeX - 2, y - 8.5, statusTextWidth + 10, 7, 2, 2, 'F');
  doc.setTextColor(...brandBlue);
  doc.text(statusLabel, badgeX + 3, y - 3.5);

  y += 4;

  // ---- Job Details Table ----
  doc.setTextColor(...medGray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const details = [];
  if (catLabel) details.push(['Category', catLabel]);
  if (job.period) details.push(['Period', job.period]);
  if (job.tax_year) details.push(['Tax Year', job.tax_year]);
  if (job.date_due) details.push(['Due Date', new Date(job.date_due).toLocaleDateString('en-ZA')]);
  if (job.date_started) details.push(['Started', new Date(job.date_started).toLocaleDateString('en-ZA')]);
  if (job.date_completed) details.push(['Completed', new Date(job.date_completed).toLocaleDateString('en-ZA')]);
  if (job.assigned_to_name) details.push(['Assigned To', job.assigned_to_name]);
  if (job.description) details.push(['Description', job.description]);

  if (details.length > 0) {
    doc.autoTable({
      startY: y,
      body: details,
      theme: 'plain',
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 }, textColor: darkGray },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 35, textColor: medGray },
        1: { cellWidth: contentWidth - 35 },
      },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // ---- Progress Summary ----
  const totalItems = checklistItems.length;
  const completedItems = checklistItems.filter(i => i.is_completed).length;
  const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Section heading
  doc.setFillColor(245, 247, 250);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setTextColor(...darkGray);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Progress Overview', margin + 3, y + 5.5);
  y += 12;

  // Progress bar
  const barHeight = 6;
  const barWidth = contentWidth - 50;

  // Background bar
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, barWidth, barHeight, 2, 2, 'F');

  // Filled portion
  if (pct > 0) {
    const fillColor = pct === 100 ? green : brandBlue;
    doc.setFillColor(...fillColor);
    const fillWidth = Math.max(4, (barWidth * pct) / 100);
    doc.roundedRect(margin, y, fillWidth, barHeight, 2, 2, 'F');
  }

  // Percentage text
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(pct === 100 ? green[0] : brandBlue[0], pct === 100 ? green[1] : brandBlue[1], pct === 100 ? green[2] : brandBlue[2]);
  doc.text(`${pct}%`, margin + barWidth + 4, y + 5);

  // Count text
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...medGray);
  doc.text(`${completedItems} of ${totalItems} tasks completed`, margin, y + barHeight + 5);
  y += barHeight + 10;

  // ---- Due Date Status ----
  if (job.date_due && job.status !== 'completed') {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(job.date_due); due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due - today) / 86400000);
    let dueText = '';
    let dueColor = medGray;

    if (diff < 0) { dueText = `⚠ ${Math.abs(diff)} days overdue`; dueColor = red; }
    else if (diff === 0) { dueText = '⚠ Due today'; dueColor = red; }
    else if (diff <= 7) { dueText = `${diff} days remaining`; dueColor = [234, 179, 8]; }
    else { dueText = `${diff} days remaining`; }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...dueColor);
    doc.text(dueText, margin, y);
    y += 6;
  }

  y += 2;

  // ---- Checklist Table ----
  if (totalItems > 0) {
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setTextColor(...darkGray);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Task Checklist', margin + 3, y + 5.5);
    y += 12;

    const tableData = checklistItems.map((item, idx) => [
      (idx + 1).toString(),
      item.title + (item.is_required ? ' *' : ''),
      item.is_completed ? '✓ Done' : 'Pending',
      item.is_completed && item.completed_by_name ? item.completed_by_name : '-',
    ]);

    doc.autoTable({
      startY: y,
      head: [['#', 'Task', 'Status', 'Completed By']],
      body: tableData,
      theme: 'striped',
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: brandBlue,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        cellPadding: 3,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        textColor: darkGray,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: contentWidth - 60 },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 28 },
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 2) {
          if (data.cell.raw === '✓ Done') {
            data.cell.styles.textColor = green;
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = medGray;
          }
        }
      },
    });

    y = doc.lastAutoTable.finalY + 6;
  }

  // ---- Notes ----
  if (job.notes) {
    // Check if we need a new page
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = margin;
    }

    doc.setFillColor(245, 247, 250);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setTextColor(...darkGray);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes', margin + 3, y + 5.5);
    y += 12;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    const notesLines = doc.splitTextToSize(job.notes, contentWidth);
    doc.text(notesLines, margin, y);
    y += notesLines.length * 4.5;
  }

  // ---- Footer ----
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...lightGray);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...medGray);
  doc.text('This report was generated from Agility by LMW Finance', margin, pageHeight - 8);
  doc.text(`Page 1 of 1`, pageWidth - margin, pageHeight - 8, { align: 'right' });

  // Save
  const safeName = (job.title || 'Job').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
  const customerSafe = (customerName || 'Client').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
  doc.save(`Progress_Report_${customerSafe}_${safeName}.pdf`);
}
