import React, { createContext, useContext, useState, useCallback } from "react";
import RecordService from "../services/RecordService";

// Create the context
const RecordContext = createContext();

export const RecordContextProvider = ({ children }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createRecord = useCallback(async (recordData) => {
    try {
      const newRecord = await RecordService.createRecord(recordData);
      setRecords((prevRecords) => [...prevRecords, newRecord]);
      return newRecord;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, []);

  const fetchRecord = useCallback(async (recordId) => {
    setLoading(true);
    try {
      const data = await RecordService.fetchRecord(recordId);
      setError(null);
      return data;
    } catch (error) {
      console.error("Fetch record error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRecordsByDoctor = useCallback(async () => {
    setLoading(true);
    try {
      const doctorRecords = await RecordService.getRecordsByDoctor();
      setRecords(doctorRecords);
      setError(null);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRecord = useCallback(async (recordId, updatedData) => {
    try {
      const updatedRecord = await RecordService.updateRecord(
        recordId,
        updatedData
      );
      setRecords((prevRecords) =>
        prevRecords.map((record) =>
          record._id === recordId ? updatedRecord : record
        )
      );
      return updatedRecord;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, []);

  const deleteRecord = useCallback(async (recordId) => {
    try {
      await RecordService.deleteRecord(recordId);
      setRecords((prevRecords) =>
        prevRecords.filter((record) => record._id !== recordId)
      );
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, []);

  return (
    <RecordContext.Provider
      value={{
        records,
        loading,
        error,
        createRecord,
        fetchRecord,
        getRecordsByDoctor,
        updateRecord,
        deleteRecord,
      }}
    >
      {children}
    </RecordContext.Provider>
  );
};

export const useRecordContext = () => {
  const context = useContext(RecordContext);
  if (!context) {
    throw new Error("useRecordContext must be used within a RecordProvider");
  }
  return context;
};
