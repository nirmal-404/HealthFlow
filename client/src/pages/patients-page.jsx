import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Plus, Filter, ChevronDown, ChevronUp, Calendar, MoreVertical, TrendingDown, TrendingUp, UserPlus } from "lucide-react"
import Button from "../components/ui/button"
import Input from "../components/ui/input"
import Badge from "../components/ui/badge"
import Avatar from "../components/ui/avatar"
import { useHoverPanel } from "../context/HoverPanelContext"
import { useRecordContext } from "../context/RecordContext"
import CreatePatientForm from "../components/record/CreatePatientForm"
import HoverPanel from "../components/ui/hover-panel"

export default function PatientsPage() {
  const { records, loading, error, getRecordsByDoctor, deleteRecord } = useRecordContext();
  const navigate = useNavigate();
  const { openPanel } = useHoverPanel()
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("fullName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [dateFilter, setDateFilter] = useState("Last 30 days");
  
  // Statistics state
  const [stats, setStats] = useState({
    totalPatients: 0,
    activePatients: 0
  });
  
  useEffect(() => {
    getRecordsByDoctor();
  }, [getRecordsByDoctor])
  
  useEffect(() => {
    if (records.length > 0) {
      // Calculate statistics from records
      const activeCount = records.filter(patient => patient.activeStatus === true).length;
      setStats({
        totalPatients: records.length,
        activePatients: activeCount
      });
    }
  }, [records]);

  const handleAddPatient = () => {
    openPanel("[PatientsPage]Add New Patient", <CreatePatientForm onSuccess={handlePatientAdded} />)
  }

  const handleRowClick = (id) => {
    navigate(`${id}`);
  };

  const handlePatientAdded = () => {
    console.log("[PatientsPage]Patient added successfully")
    getRecordsByDoctor(); // Refresh the records after adding a new patient
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Prevent row click when clicking delete button
    if (window.confirm("Are you sure you want to delete this patient record?")) {
      try {
        await deleteRecord(id);
      } catch (error) {
        console.error("Error deleting patient:", error);
      }
    }
  };

  const handleSort = (field) => {
    // If clicking the same field, toggle direction
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // If clicking a new field, set it as sort field with asc direction
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getStatusBadge = (isActive) => {
    if (isActive === true) {
      return <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-600">Active</span>
    } else if (isActive === false) {
      return <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-600">Inactive</span>
    } else {
      return <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-600">Unknown</span>
    }
  }
  
  // Filter patients based on search term
  const filteredRecords = records.filter(patient => {
    const searchLower = searchTerm.toLowerCase();
    return (
      patient.fullName?.toLowerCase().includes(searchLower) ||
      patient.phone?.toLowerCase().includes(searchLower)
    );
  });
  
  // Sort records based on current sort field and direction
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading patient records...</div>
  }

  if (error) {
    return <div className="bg-red-100 text-red-800 p-4 rounded">{error}</div>
  }

  return (
    <div className="container mx-auto p-4 bg-white">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="border rounded-lg p-4">
          <div className="text-gray-500 text-sm">Total Patients</div>
          <div className="flex items-baseline mt-1">
            <span className="text-2xl font-bold">{stats.totalPatients}</span>
            <span className="ml-2 text-green-500 text-xs flex items-center">
              <TrendingUp size={14} className="mr-1" />
              Last 30 days
            </span>
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-gray-500 text-sm">Active Patients</div>
          <div className="flex items-baseline mt-1">
            <span className="text-2xl font-bold">{stats.activePatients}</span>
            <span className="ml-2 text-green-500 text-xs flex items-center">
              <TrendingUp size={14} className="mr-1" />
              {Math.round((stats.activePatients / stats.totalPatients) * 100) || 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row justify-between mb-6">
        <div className="relative mb-4 md:mb-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex space-x-2">
          <button className="flex items-center border rounded-lg px-4 py-2 text-gray-700">
            <Calendar size={18} className="mr-2 text-gray-500" />
            <span>{dateFilter}</span>
            <ChevronDown size={18} className="ml-2 text-gray-500" />
          </button>
          <button 
            className="bg-blue-600 text-white rounded-lg px-4 py-2 flex items-center"
            onClick={handleAddPatient}
          >
            <UserPlus size={18} className="mr-2" />
            <span>New Patient</span>
          </button>
        </div>
      </div>

      {/* Table */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-6 bg-gray-100 rounded">No patient records found.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('fullName')}
                >
                  <div className="flex items-center">
                    <span>Name</span>
                    {sortField === 'fullName' ? (
                      sortDirection === 'asc' ? <ChevronDown size={16} className="ml-1" /> : <ChevronUp size={16} className="ml-1" />
                    ) : <ChevronDown size={16} className="ml-1" />}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('phone')}
                >
                  <div className="flex items-center">
                    <span>Contact</span>
                    {sortField === 'phone' ? (
                      sortDirection === 'asc' ? <ChevronDown size={16} className="ml-1" /> : <ChevronUp size={16} className="ml-1" />
                    ) : <ChevronDown size={16} className="ml-1" />}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('dateOfBirth')}
                >
                  <div className="flex items-center">
                    <span>DOB</span>
                    {sortField === 'dateOfBirth' ? (
                      sortDirection === 'asc' ? <ChevronDown size={16} className="ml-1" /> : <ChevronUp size={16} className="ml-1" />
                    ) : <ChevronDown size={16} className="ml-1" />}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('gender')}
                >
                  <div className="flex items-center">
                    <span>Gender</span>
                    {sortField === 'gender' ? (
                      sortDirection === 'asc' ? <ChevronDown size={16} className="ml-1" /> : <ChevronUp size={16} className="ml-1" />
                    ) : <ChevronDown size={16} className="ml-1" />}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('activeStatus')}
                >
                  <div className="flex items-center">
                    <span>Status</span>
                    {sortField === 'activeStatus' ? (
                      sortDirection === 'asc' ? <ChevronDown size={16} className="ml-1" /> : <ChevronUp size={16} className="ml-1" />
                    ) : <ChevronDown size={16} className="ml-1" />}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedRecords.map((patient) => (
                <tr
                  key={patient._id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleRowClick(patient._id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar
                        initials={patient.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                        size="sm"
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium text-blue-600">{patient.fullName}</div>
                        <div className="text-sm text-gray-500">
                          {patient.patientId && <span>#{patient.patientId}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.dateOfBirth}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.gender}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(patient.activeStatus)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end items-center space-x-2">
                      <button className="text-gray-400 hover:text-gray-500">
                        <MoreVertical size={18} />
                      </button>
                      <button 
                        className="text-red-500 hover:text-red-600"
                        onClick={(e) => handleDelete(patient._id, e)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <HoverPanel />
    </div>
  )
}

