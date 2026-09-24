import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { getAllDoctors } from '../services/doctorService';
import AppointmentModal from '../components/appointment-schedule/AppointmentModal';

const DoctorSearch = () => {
    const [doctors, setDoctors] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchDoctors();
    }, []);

    const fetchDoctors = async () => {
        try {
            const doctorsData = await getAllDoctors();
            setDoctors(doctorsData);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching doctors:', error);
            setLoading(false);
        }
    };    const filteredDoctors = doctors.filter(doctor =>
        doctor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.doctorInfo?.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleBookAppointment = (doctor) => {
        setSelectedDoctor(doctor);
        setIsModalOpen(true);
    };

    return (
        <div className="h-full w-full bg-white p-4">
            {/* Header Row with Count and Search */}
            <div className="flex items-center justify-between mb-6">
                {/* Doctor Count */}
                <div className="flex items-center">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-4 h-4 text-indigo-600"
                        >
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </div>
                    <span className="text-2xl text-gray-600 mr-2">{doctors.length}</span>
                    <span className="text-gray-400">Doctors</span>
                </div>

                {/* Search Bar */}
                <div className="relative w-1/3 mx-auto">
                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search doctors..."
                        className="pl-8 pr-3 py-2.5 w-full bg-gray-100 rounded-[10px] text-sm focus:outline-none focus:ring-1 focus:ring-indigo-100"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Empty div for flex spacing */}
                <div className="w-32"></div>
            </div>            {/* Table Container */}
            <div className="flex justify-center px-4">
                <div className="w-full max-w-9xl">
                    <div className="overflow-hidden rounded-xl">
                        <table className="w-full">
                            <thead>                                <tr className="bg-gray-100">
                                    <th className="px-12 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        NAME
                                    </th>
                                    <th className="px-12 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        CONTACT
                                    </th>
                                    <th className="px-12 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        SPECIALIZATION
                                    </th>
                                    <th className="px-12 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="text-center py-4">Loading...</td>
                                    </tr>
                                ) : filteredDoctors.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="text-center py-4">No doctors found</td>
                                    </tr>
                                ) : (
                                    filteredDoctors.map((doctor) => (
                                        <tr key={doctor._id} className="hover:bg-gray-50">
                                            <td className="px-12 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="ml-0">
                                                        <div className="text-sm font-medium text-gray-900">{doctor.name}</div>
                                                        <div className="text-sm text-gray-400">{doctor.role}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-12 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">{doctor.phone}</div>
                                                <div className="text-sm text-indigo-400">{doctor.email}</div>
                                            </td>
                                            <td className="px-12 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">{doctor.doctorInfo?.specialization || 'General'}</div>
                                            </td>
                                            <td className="px-12 py-4 whitespace-nowrap text-right">
                                                <button 
                                                    onClick={() => handleBookAppointment(doctor)}
                                                    className="inline-flex items-center px-4 py-2 border border-indigo-300 text-sm font-medium rounded-[10px] text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                >
                                                    Book Appointment
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>            {/* Appointment Modal */}
            {selectedDoctor && (
                <AppointmentModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    doctorName={selectedDoctor.name}
                    doctorId={selectedDoctor._id}
                    specialization={selectedDoctor.doctorInfo?.specialization || 'General'}
                />
            )}
        </div>
    );
};

export default DoctorSearch;
