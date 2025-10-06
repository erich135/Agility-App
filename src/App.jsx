import React, { useEffect, useMemo, useState } from "react";
import supabase from './lib/SupabaseClient';
import { getFilingStatus } from "./lib/dueStatus";
import dayjs from "dayjs";

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

function App() {
  // --- state ---
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

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
  // header shadow when scrolled
  const [headerShadow, setHeaderShadow] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(document.body.classList.contains('dark'));
  const [logoLoaded, setLogoLoaded] = useState(true);

  useEffect(() => {
    const onScroll = () => {
      setHeaderShadow(window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    // run once to set initial state
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // keyboard shortcut: Ctrl/Cmd+K toggles dark mode and focuses search
  const searchRef = React.useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setDarkMode((d) => !d);
        setTimeout(() => searchRef.current && searchRef.current.focus(), 50);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Sticky header: title, legend and controls */}
      <div className={`sticky top-0 bg-white z-40 py-4 -mx-6 px-6 border-b border-gray-200 transition-shadow duration-200 ${headerShadow ? 'shadow-lg' : 'shadow-none'}`}>
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {logoLoaded ? (
                <a href="http://agility.co.za" target="_blank" rel="noopener noreferrer" title="Agility">
                  <img
                    src="/agility-logo.png"
                    alt="Agility Logo"
                    className="h-14 w-auto rounded shadow-sm bg-white p-1"
                    style={{ objectFit: "contain" }}
                    onError={() => setLogoLoaded(false)}
                  />
                </a>
              ) : (
                <a href="http://agility.co.za" target="_blank" rel="noopener noreferrer" className="h-12 px-4 flex items-center justify-center rounded bg-white text-sm font-semibold text-slate-800 shadow-sm">Agility</a>
              )}
              <h1 className="text-2xl font-bold">CIPC Annual Returns Tracker</h1>
            </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost" onClick={() => setDarkMode((d) => !d)} aria-pressed={darkMode}>{darkMode ? 'Light' : 'Dark'}</button>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-4">
            {/* Tooltip icon legend (collapses into a small info icon on small screens) */}
            <div className="relative">
              <button
                className="md:hidden btn-ghost w-8 h-8 flex items-center justify-center rounded-full"
                aria-label="Legend"
                aria-describedby="legend-tooltip"
                onClick={() => setLegendOpen((s) => !s)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setLegendOpen((s) => !s);
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M18 10c0 4.418-3.582 8-8 8s-8-3.582-8-8 3.582-8 8-8 8 3.582 8 8zm-8.93-3.28a1 1 0 011.86 0l.07.26.07.26c.2.76.61 1.47 1.2 2.05.59.59 1.29 1 2.05 1.2l.26.07.26.07a1 1 0 010 1.86l-.26.07-.26.07c-.76.2-1.47.61-2.05 1.2-.59.59-1 1.29-1.2 2.05l-.07.26-.07.26a1 1 0 01-1.86 0l-.07-.26-.07-.26c-.2-.76-.61-1.47-1.2-2.05-.59-.59-1.29-1-2.05-1.2l-.26-.07-.26-.07a1 1 0 010-1.86l.26-.07.26-.07c.76-.2 1.47-.61 2.05-1.2.59-.59 1-1.29 1.2-2.05l.07-.26.07-.26z" clipRule="evenodd" />
                </svg>
              </button>
              <div id="legend-tooltip" role="tooltip" className={`absolute md:static left-0 md:left-auto top-full md:top-auto mt-2 md:mt-0 z-50 md:z-auto w-64 md:w-auto p-3 bg-white border rounded shadow-lg text-sm ${legendOpen ? 'block' : 'hidden'} md:block`}>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-5 h-5 rounded bg-[#0000FF]" />
                  <span>Blue — Up to date / filed for this cycle</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-block w-5 h-5 rounded bg-[#FF8C00]" />
                  <span>Orange — Due this month (from 1st)</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-block w-5 h-5 rounded bg-[#FF0000]" />
                  <span>Red — Overdue (from 16th)</span>
                </div>
              </div>
            </div>

            {/* Search + Month Filter + Add */}
            <div className="ml-auto flex flex-col md:flex-row items-stretch md:items-center gap-2">
              <input ref={searchRef} type="text" placeholder="Search clients..." className="border border-gray-300 rounded px-3 py-2 w-full md:max-w-md" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="border border-gray-300 rounded px-3 py-2 w-full md:w-auto" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
                {monthOptions.map((m) => (<option key={m.v} value={m.v}>{m.t}</option>))}
              </select>
              <button onClick={() => openForm()} className="btn-primary">+ Add Client</button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky column headers below the main header */}
      <div className="mb-3 overflow-x-auto">
        <div className="sticky top-[86px] bg-white z-30 inline-grid grid-cols-7 gap-4 text-xs font-semibold py-2">
          <button className="text-left" onClick={() => toggleSort("client_name")}>Client Name {sortIndicator("client_name")}</button>
          <button className="text-left" onClick={() => toggleSort("registration_number")}>Reg Number {sortIndicator("registration_number")}</button>
          <button className="text-left" onClick={() => toggleSort("registration_date")}>Reg Date {sortIndicator("registration_date")}</button>
          <button className="text-left" onClick={() => toggleSort("due_month")}>Due Month {sortIndicator("due_month")}</button>
          <button className="text-left" onClick={() => toggleSort("last_cipc_filed")}>CIPC Filed {sortIndicator("last_cipc_filed")}</button>
          <button className="text-left" onClick={() => toggleSort("last_bo_filed")}>BO Filed {sortIndicator("last_bo_filed")}</button>
          <span className="text-left text-gray-500">Actions</span>
        </div>
      </div>

      {/* Cards list */}
      {loading ? (
        <p>Loading clients...</p>
      ) : (
        <div className="space-y-4">
          {filteredClients.length === 0 ? (
            <div className="text-center text-gray-500">No clients found.</div>
          ) : (
            filteredClients.map((client) => {
              const colorClass = getRowColor(client);
              const isOverdue = colorClass.includes('#FF0000');
              return (
                <div key={client.id} className={`client-card overflow-hidden ${colorClass} ${isOverdue ? 'overdue-pulse' : ''}`}>
                  <div className="flex">
                    <div className="w-2" />
                    <div className="flex-1 p-4 text-white">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex flex-col gap-2">
                          <button onClick={() => openForm(client)} className="btn-ghost text-sm">Edit</button>
                          <button onClick={() => deleteClient(client.id)} className="btn-ghost text-sm text-red-600">Delete</button>
                        </div>
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                          <div><strong>Client:</strong> {client.client_name}</div>
                          <div><strong>Reg No:</strong> {client.registration_number}</div>
                          <div><strong>Reg Date:</strong> {fmtDDMMYYYY(client.registration_date)}</div>
                          <div><strong>Due Month:</strong> {getDueMonthLabel(client)}</div>
                          <div><strong>CIPC Filed:</strong> {client.last_cipc_filed ? fmtDDMMYYYY(client.last_cipc_filed) : '-'}</div>
                          <div><strong>BO Filed:</strong> {client.last_bo_filed ? fmtDDMMYYYY(client.last_bo_filed) : '-'}</div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div>
                            <button onClick={() => updateFiling(client.id, 'cipc', 'mark')} className="btn-primary mr-2 text-sm">Mark CIPC</button>
                            {client.last_cipc_filed && <button onClick={() => updateFiling(client.id, 'cipc', 'undo')} className="btn-ghost text-sm">Undo</button>}
                          </div>
                          <div>
                            <button onClick={() => updateFiling(client.id, 'bo', 'mark')} className="btn-primary mr-2 text-sm bg-violet-500 hover:bg-violet-600">Mark BO</button>
                            {client.last_bo_filed && <button onClick={() => updateFiling(client.id, 'bo', 'undo')} className="btn-ghost text-sm">Undo</button>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add/Edit Client Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">{isEditing ? 'Edit Client' : 'Add New Client'}</h2>
            <form onSubmit={handleFormSubmit} className="space-y-3">
              <input type="text" required placeholder="Client Name" value={formData.client_name} onChange={(e) => setFormData({ ...formData, client_name: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" />
              <input type="text" required placeholder="Registration Number" value={formData.registration_number} onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" />
              <input type="date" required value={formData.registration_date} onChange={(e) => setFormData({ ...formData, registration_date: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" />
              <input type="text" placeholder="Due Month (e.g. January)" value={formData.due_month} onChange={(e) => setFormData({ ...formData, due_month: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" />
              <input type="date" placeholder="Last CIPC Filed" value={formData.last_cipc_filed} onChange={(e) => setFormData({ ...formData, last_cipc_filed: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" />
              <input type="date" placeholder="Last BO Filed" value={formData.last_bo_filed} onChange={(e) => setFormData({ ...formData, last_bo_filed: e.target.value })} className="w-full border border-gray-300 rounded px-3 py-2" />
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={closeForm} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">{isEditing ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
