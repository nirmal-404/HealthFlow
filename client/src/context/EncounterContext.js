import React, { createContext, useContext, useState, useCallback } from "react";
import EncounterService from "../services/EncounterService";

// Create the context
const EncounterContext = createContext();

export const EncounterContextProvider = ({ children }) => {
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createEncounter = useCallback(async (recordId, encounterData) => {
    try {
      const newEncounter = await EncounterService.createEncounter(
        recordId,
        encounterData
      );
      setEncounters((prev) => [...prev, newEncounter]);
      return newEncounter;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, []);

  const getEncountersByRecordId = useCallback(async (recordId) => {
    setLoading(true);
    console.log("[Context] Fetching for recordId:", recordId);
    try {
      const fetchedEncounters = await EncounterService.getEncountersByRecordId(
        recordId
      );
      console.log("[Context] Received encounters:", fetchedEncounters);
      setEncounters(fetchedEncounters);
      setError(null);
      return fetchedEncounters;
    } catch (error) {
      console.error("[Context] Error:", error.message);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getEncounterById = useCallback(async (encounterId) => {
    setLoading(true);
    try {
      const encounter = await EncounterService.getEncounterById(encounterId);
      setError(null);
      return encounter;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateEncounter = useCallback(async (encounterId, updatedData) => {
    try {
      const updated = await EncounterService.updateEncounter(
        encounterId,
        updatedData
      );
      // Fix: Correctly update the encounters array using the _id property
      setEncounters((prev) =>
        prev.map((e) => (e._id === encounterId ? updated : e))
      );
      return updated;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, []);

  const deleteEncounter = useCallback(async (encounterId) => {
    try {
      await EncounterService.deleteEncounter(encounterId);
      // Fix: Correctly filter the encounters array using the _id property
      setEncounters((prev) => prev.filter((e) => e._id !== encounterId));
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, []);

  return (
    <EncounterContext.Provider
      value={{
        encounters,
        loading,
        error,
        createEncounter,
        getEncountersByRecordId,
        getEncounterById,
        updateEncounter,
        deleteEncounter,
      }}
    >
      {children}
    </EncounterContext.Provider>
  );
};

export const useEncounterContext = () => {
  const context = useContext(EncounterContext);
  if (!context) {
    throw new Error(
      "useEncounterContext must be used within an EncounterContextProvider"
    );
  }
  return context;
};
