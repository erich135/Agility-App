import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link } from 'react-router-dom';
import supabase from '../lib/SupabaseClient';
import { getFilingStatus } from "../lib/dueStatus";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/* ----------------------- DATE HELPERS (robust) ----------------------- */
// Parse many inputs -> { y, m, d } (numbers) or null
const parseParts = (val) => {
  if (!val) return null;
  const s = String(val).trim();

  // DD/MM/YYYY or DD-MM-YYYY
  let m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return { y: +yyyy, m: +mm, d: +dd };
  }

  // YYYY/MM/DD or YYYY-MM-DD
  m = s.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
  if (m) {
    const [, yyyy, mm, dd] = m;
    return { y: +yyyy, m: +mm, d: +dd };
  }

  // Fallback: let Date try, then extract parts
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return null;
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
};

// Always return ISO YYYY-MM-DD (or "")
const toISO = (val) => {
  const p = parseParts(val);
  if (!p) return "";
  const mm = String(p.m).padStart(2, "0");
  const dd = String(p.d).padStart(2, "0");
  return `${p.y}-${mm}-${dd}`;
};

// Safe Date (local) from a date-like string
const makeDate = (val) => {
  const p = parseParts(val);
  if (!p) return null;
  return new Date(p.y, p.m - 1, p.d);
};

// Format for UI: DD/MM/YYYY (or "-")
const fmtDDMMYYYY = (val) => {
  if (!val) return "-";
  const d = makeDate(val);
  if (!d) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};
/* -------------------------------------------------------------------- */

const CIPCManagement = () => {
  // --- state ---
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [headerShadow, setHeaderShadow] = useState(false);
  const searchRef = useRef(null);
  const [legendFilter, setLegendFilter] = useState(null); // null | 'red' | 'orange' | 'blue'

  // search + month filter
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all"); // "all" or 0..11

  // sorting
  const [sortBy, setSortBy] = useState("client_name"); // default
  const [sortAsc, setSortAsc] = useState(true);

  // modal
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    client_name: "",
    registration_number: "",
    registration_date: "",
    due_month: "",
    last_cipc_filed: "",
    last_bo_filed: "",
  });

  // --- helpers: due month from registration date ---
  const getDueMonthIndex = (c) => {
    const d = makeDate(c.registration_date);
    return d ? d.getMonth() : 0; // 0..11
  };
  const getDueMonthLabel = (c) => {
    const d = makeDate(c.registration_date);
    return d
      ? d.toLocaleString("default", { month: "long" })
      : "-";
  };

  // sort toggler + indicator
  const toggleSort = (field) => {
    setSortAsc((prevAsc) => (sortBy === field ? !prevAsc : true));
    setSortBy(field);
  };
  const sortIndicator = (field) =>
    sortBy === field ? (sortAsc ? "▲" : "▼") : "";

  // --- data load ---
  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortAsc]);

  // header shadow on scroll + keyboard shortcut to focus search
  useEffect(() => {
    const onScroll = () => setHeaderShadow(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);

    const onKey = (e) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      if ((isMac && e.metaKey && e.key === 'k') || (!isMac && e.ctrlKey && e.key === 'k')) {
        e.preventDefault();
        searchRef.current && searchRef.current.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const fetchClients = async () => {
    setLoading(true);

    // For "due_month" (derived), we fetch without order and sort locally.
    const query = supabase.from("clients").select("*");
    if (sortBy !== "due_month") {
      query.order(sortBy, { ascending: sortAsc });
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching data:", error.message);
      setClients([]);
    } else {
      // Normalize date fields to ISO so logic is consistent
      const normalized = (data || []).map((row) => ({
        ...row,
        registration_date: toISO(row.registration_date),
        last_cipc_filed: row.last_cipc_filed ? toISO(row.last_cipc_filed) : null,
        last_bo_filed: row.last_bo_filed ? toISO(row.last_bo_filed) : null,
      }));
      setClients(normalized);
    }
    setLoading(false);
  };

  // client-side sort (only for "due_month")
  const sortedClients = useMemo(() => {
    if (sortBy !== "due_month") return clients;

    const list = [...clients];
    list.sort((a, b) => {
      const ma = getDueMonthIndex(a);
      const mb = getDueMonthIndex(b);
      return sortAsc ? ma - mb : mb - ma;
    });
    return list;
  }, [clients, sortBy, sortAsc]);

  // month filter (runs on sorted list)
  const monthFiltered = useMemo(() => {
    if (monthFilter === "all") return sortedClients;
    const m = Number(monthFilter);
    return sortedClients.filter((c) => getDueMonthIndex(c) === m);
  }, [sortedClients, monthFilter]);

  // search filter (after month filter)
  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return monthFiltered;
    return monthFiltered.filter((c) =>
      (c.client_name || "").toLowerCase().includes(term)
    );
  }, [monthFiltered, search]);

  // apply legend color filter to the final displayed set
  const displayedClients = useMemo(() => {
    if (!legendFilter) return filteredClients;
    return filteredClients.filter((c) => {
      const status = getFilingStatus(
        c.registration_date,
        c.last_cipc_filed,
        c.last_bo_filed
      );
      return status === legendFilter;
    });
  }, [filteredClients, legendFilter]);

  /* -------------------- EXPORT HELPERS -------------------- */
  const getExportRows = () =>
    displayedClients.map((c) => {
      const status = getFilingStatus(c.registration_date, c.last_cipc_filed, c.last_bo_filed);
      const statusLabel =
        status === "red" ? "Overdue" : status === "orange" ? "Due this month" : "Filed";
      return {
        "Client Name": c.client_name || "",
        "Reg Number": c.registration_number || "",
        "Reg Date": fmtDDMMYYYY(c.registration_date),
        "Due Month": getDueMonthLabel(c),
        "CIPC Filed": c.last_cipc_filed ? fmtDDMMYYYY(c.last_cipc_filed) : "-",
        "BO Filed": c.last_bo_filed ? fmtDDMMYYYY(c.last_bo_filed) : "-",
        Status: statusLabel,
      };
    });

  const exportToXlsx = () => {
    const rows = getExportRows();
    if (!rows.length) return alert("No data to export.");
    const ws = XLSX.utils.json_to_sheet(rows);

    /* auto-size columns */
    const cols = Object.keys(rows[0]);
    ws["!cols"] = cols.map((key) => {
      const maxLen = Math.max(key.length, ...rows.map((r) => String(r[key] || "").length));
      return { wch: maxLen + 2 };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CIPC Returns");

    const monthLabel =
      monthFilter === "all"
        ? "All_Months"
        : monthOptions.find((m) => String(m.v) === String(monthFilter))?.t || "Filtered";
    XLSX.writeFile(wb, `CIPC_Annual_Returns_${monthLabel}_${dayjs().format("YYYY-MM-DD")}.xlsx`);
  };

  const exportToPdf = () => {
    const rows = getExportRows();
    if (!rows.length) return alert("No data to export.");

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    /* Title */
    doc.setFontSize(16);
    doc.text("CIPC Annual Returns Tracker", 14, 15);
    doc.setFontSize(10);
    const monthLabel =
      monthFilter === "all"
        ? "All Months"
        : monthOptions.find((m) => String(m.v) === String(monthFilter))?.t || "Filtered";
    doc.text(`Month: ${monthLabel}  |  Exported: ${dayjs().format("DD/MM/YYYY HH:mm")}  |  Records: ${rows.length}`, 14, 22);

    const head = [["Client Name", "Reg Number", "Reg Date", "Due Month", "CIPC Filed", "BO Filed", "Status"]];
    const body = rows.map((r) => Object.values(r));

    autoTable(doc, {
      startY: 28,
      head,
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 6) {
          const val = data.cell.raw;
          if (val === "Overdue") {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = "bold";
          } else if (val === "Due this month") {
            data.cell.styles.textColor = [217, 119, 6];
            data.cell.styles.fontStyle = "bold";
          } else {
            data.cell.styles.textColor = [22, 101, 52];
          }
        }
      },
    });

    const pdfMonthLabel = monthLabel.replace(/\s/g, "_");
    doc.save(`CIPC_Annual_Returns_${pdfMonthLabel}_${dayjs().format("YYYY-MM-DD")}.pdf`);
  };

  // --- CRUD / actions ---
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      client_name: formData.client_name,
      registration_number: formData.registration_number,
      // inputs of type="date" give YYYY-MM-DD, already ISO
      registration_date: toISO(formData.registration_date),
      due_month: formData.due_month,
      last_cipc_filed: formData.last_cipc_filed ? toISO(formData.last_cipc_filed) : null,
      last_bo_filed: formData.last_bo_filed ? toISO(formData.last_bo_filed) : null,
      updated_at: new Date().toISOString(),
    };

    if (isEditing) {
      const { error } = await supabase
        .from("clients")
        .update(payload)
        .eq("id", formData.id);
      if (error) alert("Update failed: " + error.message);
    } else {
      const { error } = await supabase.from("clients").insert([payload]);
      if (error) alert("Insert failed: " + error.message);
    }

    await fetchClients();
    closeForm();
  };

  const deleteClient = async (id) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) alert("Delete failed: " + error.message);
    else fetchClients();
  };

  const updateFiling = async (id, type = "cipc", action = "mark") => {
    const confirm = window.confirm(
      `${action === "mark" ? "Mark" : "Undo"} ${type.toUpperCase()} filing?`
    );
    if (!confirm) return;

    const updateData = {
      [`last_${type}_filed`]:
        action === "mark" ? dayjs().format("YYYY-MM-DD") : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("clients")
      .update(updateData)
      .eq("id", id);
    if (error) alert("Error updating: " + error.message);
    else await fetchClients();
  };

  const getRowColor = (client) => {
    const status = getFilingStatus(
      client.registration_date,
      client.last_cipc_filed,
      client.last_bo_filed
    );
    if (status === "red") return "bg-[#FF0000]";
    if (status === "orange") return "bg-[#FF8C00]";
    return "bg-[#0000FF]";
  };

  const openForm = (client = null) => {
    setIsEditing(!!client);
    setFormData(
      client
        ? {
            id: client.id,
            client_name: client.client_name,
            registration_number: client.registration_number,
            registration_date: toISO(client.registration_date),
            due_month: client.due_month || "",
            last_cipc_filed: client.last_cipc_filed ? toISO(client.last_cipc_filed) : "",
            last_bo_filed: client.last_bo_filed ? toISO(client.last_bo_filed) : "",
          }
        : {
            id: null,
            client_name: "",
            registration_number: "",
            registration_date: "",
            due_month: "",
            last_cipc_filed: "",
            last_bo_filed: "",
          }
    );
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setFormData({
      id: null,
      client_name: "",
      registration_number: "",
      registration_date: "",
      due_month: "",
      last_cipc_filed: "",
      last_bo_filed: "",
    });
  };

  // --- UI ---
  const monthOptions = [
    { v: "all", t: "All months" },
    { v: 0, t: "January" },
    { v: 1, t: "February" },
    { v: 2, t: "March" },
    { v: 3, t: "April" },
    { v: 4, t: "May" },
    { v: 5, t: "June" },
    { v: 6, t: "July" },
    { v: 7, t: "August" },
    { v: 8, t: "September" },
    { v: 9, t: "October" },
    { v: 10, t: "November" },
    { v: 11, t: "December" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </Link>
              <div className="h-6 border-l border-gray-300"></div>
              <img src="/agility-logo.png" alt="Agility" className="h-8"/>
              <h1 className="text-2xl font-bold text-gray-900">CIPC Annual Returns Tracker</h1>
            </div>
            <button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} aria-label="Scroll to top" className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors">Top</button>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-screen-xl mx-auto">
        <div id="app-header" className={`sticky top-0 bg-white/80 backdrop-blur-md z-20 p-4 -mx-6 mb-4 transition-shadow ${headerShadow ? 'shadow-lg' : ''}`}>
          {/* Legend (click to filter) */}
          <div className="mt-3 flex gap-3 items-center text-sm">
            <button
              type="button"
              onClick={() => setLegendFilter((s) => (s === 'blue' ? null : 'blue'))}
              aria-pressed={legendFilter === 'blue'}
              className={`px-3 py-1 rounded text-white bg-[#0000FF] focus:outline-none focus:ring-2 focus:ring-offset-2 ${legendFilter === 'blue' ? 'ring-4 ring-white/30' : ''}`}
            >
              Filed (within cycle)
            </button>

            <button
              type="button"
              onClick={() => setLegendFilter((s) => (s === 'orange' ? null : 'orange'))}
              aria-pressed={legendFilter === 'orange'}
              className={`px-3 py-1 rounded text-white bg-[#FF8C00] focus:outline-none focus:ring-2 focus:ring-offset-2 ${legendFilter === 'orange' ? 'ring-4 ring-white/30' : ''}`}
            >
              Due this month
            </button>

            <button
              type="button"
              onClick={() => setLegendFilter((s) => (s === 'red' ? null : 'red'))}
              aria-pressed={legendFilter === 'red'}
              className={`px-3 py-1 rounded text-white bg-[#FF0000] focus:outline-none focus:ring-2 focus:ring-offset-2 ${legendFilter === 'red' ? 'ring-4 ring-white/30' : ''}`}
            >
              Overdue
            </button>
          </div>
        </div>

        {/* Search + Month Filter + Add */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 mb-4">
          <input
            type="text"
            placeholder="Search clients..."
            className="border border-gray-300 rounded px-3 py-2 w-full md:max-w-md"
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="border border-gray-300 rounded px-3 py-2 w-full md:w-auto"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            {monthOptions.map((m) => (
              <option key={m.v} value={m.v}>
                {m.t}
              </option>
            ))}
          </select>

          <button
            onClick={() => openForm()}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 w-full md:w-auto"
          >
            + Add Client
          </button>

          {/* Export buttons */}
          <button
            onClick={exportToXlsx}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 w-full md:w-auto flex items-center justify-center gap-2"
            title="Export to Excel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export XLSX
          </button>

          <button
            onClick={exportToPdf}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 w-full md:w-auto flex items-center justify-center gap-2"
            title="Export to PDF"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
          </button>
        </div>

        {/* "Headers" bar for card view sorting */}
        <div className="mb-3 overflow-x-auto" style={{paddingTop: '8px'}}>
          <div className="inline-grid grid-cols-7 gap-4 text-xs font-semibold">
            <button className="text-left" onClick={() => toggleSort("client_name")}>
              Client Name {sortIndicator("client_name")}
            </button>
            <button className="text-left" onClick={() => toggleSort("registration_number")}>
              Reg Number {sortIndicator("registration_number")}
            </button>
            <button className="text-left" onClick={() => toggleSort("registration_date")}>
              Reg Date {sortIndicator("registration_date")}
            </button>
            <button className="text-left" onClick={() => toggleSort("due_month")}>
              Due Month {sortIndicator("due_month")}
            </button>
            <button className="text-left" onClick={() => toggleSort("last_cipc_filed")}>
              CIPC Filed {sortIndicator("last_cipc_filed")}
            </button>
            <button className="text-left" onClick={() => toggleSort("last_bo_filed")}>
              BO Filed {sortIndicator("last_bo_filed")}
            </button>
            <span className="text-left text-gray-500">Actions</span>
          </div>
        </div>

        {/* Cards */}
        {loading ? (
          <p>Loading clients...</p>
        ) : (
          <div className="space-y-4">
            {displayedClients.map((client) => (
              <div
                key={client.id}
                className={`rounded-lg p-4 shadow-md text-white ring-1 ring-white/40 ${getRowColor(
                  client
                )}`}
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  {/* Left: Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => openForm(client)}
                      className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteClient(client.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>

                  {/* Center: Client Info */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div>
                      <strong>Client:</strong> {client.client_name}
                    </div>
                    <div>
                      <strong>Reg No:</strong> {client.registration_number}
                    </div>
                    <div>
                      <strong>Reg Date:</strong> {fmtDDMMYYYY(client.registration_date)}
                    </div>
                    <div>
                      <strong>Due Month:</strong> {getDueMonthLabel(client)}
                    </div>
                    <div>
                      <strong>CIPC Filed:</strong>{" "}
                      {client.last_cipc_filed ? fmtDDMMYYYY(client.last_cipc_filed) : "-"}
                    </div>
                    <div>
                      <strong>BO Filed:</strong>{" "}
                      {client.last_bo_filed ? fmtDDMMYYYY(client.last_bo_filed) : "-"}
                    </div>
                  </div>

                  {/* Right: Mark/Undo */}
                  <div className="flex flex-col gap-2">
                    <div>
                      <button
                        onClick={() => updateFiling(client.id, "cipc", "mark")}
                        className="px-2 py-1 bg-blue-500 rounded hover:bg-blue-600"
                      >
                        Mark CIPC
                      </button>
                      {client.last_cipc_filed && (
                        <button
                          onClick={() => updateFiling(client.id, "cipc", "undo")}
                          className="ml-2 px-2 py-1 bg-gray-400 rounded hover:bg-gray-500"
                        >
                          Undo
                        </button>
                      )}
                    </div>
                    <div>
                      <button
                        onClick={() => updateFiling(client.id, "bo", "mark")}
                        className="px-2 py-1 bg-purple-500 rounded hover:bg-purple-600"
                      >
                        Mark BO
                      </button>
                      {client.last_bo_filed && (
                        <button
                          onClick={() => updateFiling(client.id, "bo", "undo")}
                          className="ml-2 px-2 py-1 bg-gray-400 rounded hover:bg-gray-500"
                        >
                          Undo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredClients.length === 0 && (
              <div className="text-center text-gray-500">No clients found.</div>
            )}
          </div>
        )}

        {/* Add/Edit Client Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">
                {isEditing ? "Edit Client" : "Add New Client"}
              </h2>
              <form onSubmit={handleFormSubmit} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Client Name"
                  value={formData.client_name}
                  onChange={(e) =>
                    setFormData({ ...formData, client_name: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="text"
                  required
                  placeholder="Registration Number"
                  value={formData.registration_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      registration_number: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="date"
                  required
                  value={formData.registration_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      registration_date: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Due Month (e.g. January)"
                  value={formData.due_month}
                  onChange={(e) =>
                    setFormData({ ...formData, due_month: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="date"
                  placeholder="Last CIPC Filed"
                  value={formData.last_cipc_filed}
                  onChange={(e) =>
                    setFormData({ ...formData, last_cipc_filed: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="date"
                  placeholder="Last BO Filed"
                  value={formData.last_bo_filed}
                  onChange={(e) =>
                    setFormData({ ...formData, last_bo_filed: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    {isEditing ? "Update" : "Add"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CIPCManagement;