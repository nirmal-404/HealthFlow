const Appointment = require('../models/Appointment');
const DoctorSchedule = require('../models/DoctorSchedule');
const mongoose = require('mongoose');

// Get financial report for a doctor
const getDoctorFinancialReport = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { startDate, endDate } = req.query;

        // Build date filter
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);

        // Get all appointments for the doctor with optional date filter
        const query = { doctorId };
        if (Object.keys(dateFilter).length > 0) {
            query.createdAt = dateFilter;
        }

        const appointments = await Appointment.find(query);
        
        // Get all doctor's schedules to access consultation fees
        const doctorSchedules = await DoctorSchedule.find({ doctorId });
        if (!doctorSchedules.length) {
            return res.status(404).json({ message: 'Doctor schedules not found' });
        }

        // Group appointments by month
        const monthlyData = {};
        const dailyAppointments = {};

        for (const appointment of appointments) {
            const date = new Date(appointment.createdAt);
            const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
            const dayKey = date.toISOString().split('T')[0];

            // Initialize monthly data
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    totalIncome: 0,
                    appointmentCount: 0,
                    averageDailyIncome: 0,
                    peakAppointmentDay: null,
                    peakAppointmentCount: 0
                };
            }

            // Initialize daily data
            if (!dailyAppointments[monthKey]) {
                dailyAppointments[monthKey] = {};
            }
            if (!dailyAppointments[monthKey][dayKey]) {
                dailyAppointments[monthKey][dayKey] = {
                    count: 0,
                    income: 0
                };
            }

            // Find the specific schedule and slot for this appointment
            let consultationFee = 0;
            for (const schedule of doctorSchedules) {
                const slot = schedule.slots.id(appointment.slotId);
                if (slot) {
                    consultationFee = schedule.consultationFee;
                    break;
                }
            }

            // Update counts and income with schedule-specific fee
            monthlyData[monthKey].appointmentCount++;
            monthlyData[monthKey].totalIncome += consultationFee;
            dailyAppointments[monthKey][dayKey].count++;
            dailyAppointments[monthKey][dayKey].income += consultationFee;
        }

        // Calculate additional metrics for each month
        Object.keys(monthlyData).forEach(monthKey => {
            const monthData = monthlyData[monthKey];
            const daysInMonth = Object.keys(dailyAppointments[monthKey]).length || 1;

            // Calculate average daily income
            monthData.averageDailyIncome = monthData.totalIncome / daysInMonth;

            // Find peak appointment day
            let maxCount = 0;
            let peakDay = null;
            Object.entries(dailyAppointments[monthKey]).forEach(([day, data]) => {
                if (data.count > maxCount) {
                    maxCount = data.count;
                    peakDay = day;
                }
            });
            monthData.peakAppointmentDay = peakDay;
            monthData.peakAppointmentCount = maxCount;
        });

        // Calculate growth rates
        const sortedMonths = Object.keys(monthlyData).sort();
        sortedMonths.forEach((month, index) => {
            if (index > 0) {
                const currentIncome = monthlyData[month].totalIncome;
                const previousIncome = monthlyData[sortedMonths[index - 1]].totalIncome;
                monthlyData[month].growthRate = previousIncome > 0 
                    ? ((currentIncome - previousIncome) / previousIncome) * 100 
                    : 100;
            } else {
                monthlyData[month].growthRate = 0;
            }
        });

        // Prepare trend data for charts
        const trends = {
            months: sortedMonths,
            income: sortedMonths.map(month => monthlyData[month].totalIncome),
            appointments: sortedMonths.map(month => monthlyData[month].appointmentCount),
            growth: sortedMonths.map(month => monthlyData[month].growthRate)
        };

        res.status(200).json({
            monthlyData,
            trends,
            summary: {
                totalAppointments: appointments.length,
                totalIncome: Object.values(monthlyData).reduce((sum, data) => sum + data.totalIncome, 0),
                averageMonthlyIncome: trends.income.reduce((sum, income) => sum + income, 0) / trends.income.length || 0,
                averageGrowthRate: trends.growth.reduce((sum, rate) => sum + rate, 0) / trends.growth.length || 0
            }
        });

    } catch (error) {
        console.error('Error generating financial report:', error);
        res.status(500).json({ message: 'Error generating financial report', error: error.message });
    }
};

module.exports = {
    getDoctorFinancialReport
};