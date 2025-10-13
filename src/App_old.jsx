import React from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import CIPCManagement from './components/CIPCManagement';
import CustomerManagement from './components/CustomerManagement';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cipc" element={<CIPCManagement />} />
        <Route path="/customers" element={<CustomerManagement />} />
      </Routes>
    </Router>
  );
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
    <div className="p-6 max-w-screen-xl mx-auto">
      <header id="app-header" className={`sticky top-0 bg-white/80 backdrop-blur-md z-20 p-4 -mx-6 mb-4 transition-shadow ${headerShadow ? 'scrolled' : ''}`}>
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/agility-logo.png" alt="Agility" style={{height:40}}/>
            <h1 className="text-2xl font-bold">CIPC Annual Returns Tracker</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} aria-label="Scroll to top" className="px-3 py-1 bg-gray-100 rounded">Top</button>
          </div>
        </div>
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
      </header>

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
      </div>

  {/* “Headers” bar for card view sorting */}
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
  );
}

export default App;
