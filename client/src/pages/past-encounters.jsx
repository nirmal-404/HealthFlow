import React, { useState, useEffect, use } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronDown, Calendar, Activity, TrendingUp } from 'lucide-react';
import { useLinkedRecordContext } from '../context/LinkedRecordContext';
import api from '../services/api';

const PastEncounters = () => {
  const { linkedRecordIds, loading: linkLoading, error: linkError } = useLinkedRecordContext();
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState('Last 30 days');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });
  
  // Statistics state
  const [stats, setStats] = useState({
    totalAppointments: 0,
    completedAppointments: 0
  });

  useEffect(() => {
    const fetchEncountersForRecord = async (recordId) => {
      try {
        const response = await api.get(`${process.env.REACT_APP_API_URL}/encounters/by-record/${recordId}`);
        return response.data;
      } catch (err) {
        console.error(`Error fetching encounters for record ${recordId}:`, err);
        return [];
      }
    };

    const fetchAllEncounters = async () => {
      if (!linkedRecordIds || linkedRecordIds.length === 0) {
        setLoading(false);
        return;
      }
      
      try {
        // Fetch encounters for all linked records in parallel
        const allEncounters = await Promise.all(
          linkedRecordIds.map(recordId => fetchEncountersForRecord(recordId))
        );

        // Combine and sort all encounters by date, newest first
        const combinedEncounters = allEncounters
          .flat()
          .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

        setEncounters(combinedEncounters);
        
        // Calculate statistics
        setStats({
          totalAppointments: combinedEncounters.length,
          completedAppointments: combinedEncounters.filter(enc => enc.status === 'Completed').length || 0
        });
      } catch (err) {
        setError(err.message || 'Failed to fetch encounters');
      } finally {
        setLoading(false);
      }
    };

    fetchAllEncounters();
  }, [linkedRecordIds]);

  // Filter encounters based on search term and date range
  const filteredEncounters = encounters.filter(encounter => {
    const searchLower = searchTerm.toLowerCase();
    const doctorNameMatches = encounter.provider?.name?.toLowerCase().includes(searchLower);
    const reasonMatches = encounter.reasonForEncounter?.toLowerCase().includes(searchLower);
    const diagnosisMatches = encounter.diagnosis?.toLowerCase().includes(searchLower);
    
    const encounterDate = new Date(encounter.dateTime);
    const dateInRange = encounterDate >= dateRange.start && encounterDate <= dateRange.end;
    
    return (doctorNameMatches || reasonMatches || diagnosisMatches) && dateInRange;
  });

  const handleDateFilterChange = (filter) => {
    setDateFilter(filter);
    const now = new Date();
    let startDate;
    
    switch(filter) {
      case 'Last 7 days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'Last 30 days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'Last 90 days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'All time':
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    setDateRange({
      start: startDate,
      end: now
    });
  };

  if (linkLoading || loading) {
    return <div className="flex justify-center items-center h-screen">Loading appointments...</div>;
  }

  if (error) {
    return <div className="bg-red-100 text-red-800 p-4 rounded">{error}</div>;
  }

  if (!linkedRecordIds || linkedRecordIds.length === 0) {
    return <div className="container mx-auto p-4 bg-white">
      <div className="text-center py-6 bg-gray-100 rounded">No linked patient records found.</div>
    </div>;
  }

  return (
    <div className="container mx-auto p-4 bg-white">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="border rounded-lg p-4">
          <div className="text-gray-500 text-sm">Total Past Appointments</div>
          <div className="flex items-baseline mt-1">
            <span className="text-2xl font-bold">{stats.totalAppointments}</span>
            <span className="ml-2 text-blue-500 text-xs flex items-center">
              <Activity size={14} className="mr-1" />
              All time
            </span>
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-gray-500 text-sm">Completed Appointments</div>
          <div className="flex items-baseline mt-1">
            <span className="text-2xl font-bold">{stats.completedAppointments}</span>
            <span className="ml-2 text-green-500 text-xs flex items-center">
              <TrendingUp size={14} className="mr-1" />
              {stats.totalAppointments > 0 ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100) : 0}%
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
            placeholder="Search by doctor, reason or diagnosis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex space-x-2">
          <div className="relative group">
            <button className="flex items-center border rounded-lg px-4 py-2 text-gray-700">
              <Calendar size={18} className="mr-2 text-gray-500" />
              <span>{dateFilter}</span>
              <ChevronDown size={18} className="ml-2 text-gray-500" />
            </button>
            {/* Date filter dropdown menu */}
            <div className="absolute right-0 mt-1 w-48 bg-white border rounded-md shadow-lg z-10 hidden group-hover:block">
              <ul className="py-1">
                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleDateFilterChange('Last 7 days')}>Last 7 days</li>
                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleDateFilterChange('Last 30 days')}>Last 30 days</li>
                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleDateFilterChange('Last 90 days')}>Last 90 days</li>
                <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer" onClick={() => handleDateFilterChange('All time')}>All time</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Cards */}
      {filteredEncounters.length === 0 ? (
        <div className="text-center py-6 bg-gray-100 rounded">No past appointments found.</div>
      ) : (
        <div className="space-y-4">
          {filteredEncounters.map((encounter) => (
            <div key={encounter._id} className="bg-white rounded-lg shadow p-4 border hover:border-blue-300 transition-colors duration-200 cursor-pointer">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium text-lg text-blue-600">{encounter.reasonForEncounter}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(encounter.dateTime).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(encounter.dateTime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <span className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-600">
                  {encounter.status || 'Completed'}
                </span>
              </div>
              <div className="text-sm text-gray-600 my-2">
                <span className="font-medium">Doctor:</span> Dr. {encounter.provider?.name || 'Unknown'}
              </div>
              {encounter.diagnosis && (
                <div className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Diagnosis:</span> {encounter.diagnosis}
                </div>
              )}
              {encounter.notes && (
                <div className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Notes:</span>
                  <p className="mt-1 text-gray-500">{encounter.notes}</p>
                </div>
              )}

                {encounter.diagnosis && (
                <p className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Diagnosis:</span> {encounter.diagnosis}
                </p>
              )}
              <button
                className="mt-4 w bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                onClick={() => navigate('/account/feedback/create', { state: { encounterId: encounter._id } })}
              >
                Give Feedback
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PastEncounters;