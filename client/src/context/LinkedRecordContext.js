import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuthContext } from "./AuthContext";
import RecordService from "../services/RecordService";

const LinkedRecordContext = createContext();

export const LinkedRecordProvider = ({ children }) => {
  const [linkedRecordIds, setLinkedRecordIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser, activeRole } = useAuthContext();

  useEffect(() => {
    const fetchLinkedRecords = async () => {
      try {
        // Only fetch if user is authenticated and has patient role
        if (!currentUser || activeRole?.name !== "sys_patient") {
          setLoading(false);
          return;
        }

        const response = await RecordService.getLinkRecord();
        setLinkedRecordIds(response.recordIds || []);
      } catch (err) {
        console.error("Error fetching linked records:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLinkedRecords();
  }, [currentUser, activeRole]);

  return (
    <LinkedRecordContext.Provider value={{ linkedRecordIds, loading, error }}>
      {children}
    </LinkedRecordContext.Provider>
  );
};

export const useLinkedRecordContext = () => {
  const context = useContext(LinkedRecordContext);
  if (!context) {
    throw new Error(
      "useLinkedRecordContext must be used within a LinkedRecordProvider"
    );
  }
  return context;
};
