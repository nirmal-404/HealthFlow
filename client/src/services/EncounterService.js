import TokenService from "./TokenService";

const EncounterService = {
  async createEncounter(recordId, encounterData) {
    try {
      console.log(
        "[EncounterService] Creating encounter for recordId:",
        recordId,
        "with data:",
        encounterData
      );

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/encounters/${recordId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TokenService.getAccessToken()}`,
          },
          body: JSON.stringify(encounterData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create encounter");
      }

      const data = await response.json();
      console.log("[EncounterService] Encounter created:", data.encounter);
      return data.encounter;
    } catch (error) {
      console.error("[EncounterService] Error creating encounter:", error);
      throw error;
    }
  },

  async getEncountersByRecordId(recordId) {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/encounters/by-record/${recordId}`,
        {
          headers: {
            Authorization: `Bearer ${TokenService.getAccessToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch encounters for record");
      }

      const data = await response.json();
      console.log("[EncounterService] Encounters fetched:", data);
      return data;
    } catch (error) {
      console.error("[EncounterService] Error fetching encounters:", error);
      throw error;
    }
  },

  async getEncounterById(encounterId) {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/encounters/${encounterId}`,
        {
          headers: {
            Authorization: `Bearer ${TokenService.getAccessToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch encounter");
      }

      const data = await response.json();
      console.log("[EncounterService] Encounter fetched:", data);
      return data;
    } catch (error) {
      console.error("[EncounterService] Error fetching encounter:", error);
      throw error;
    }
  },

  async updateEncounter(encounterId, updatedData) {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/encounters/${encounterId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TokenService.getAccessToken()}`,
          },
          body: JSON.stringify(updatedData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update encounter");
      }

      const data = await response.json();
      console.log("[EncounterService] Encounter updated:", data.encounter);
      return data.encounter;
    } catch (error) {
      console.error("[EncounterService] Error updating encounter:", error);
      throw error;
    }
  },

  async deleteEncounter(encounterId) {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/encounters/${encounterId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${TokenService.getAccessToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete encounter");
      }

      console.log("[EncounterService] Encounter deleted successfully");
      return true;
    } catch (error) {
      console.error("[EncounterService] Error deleting encounter:", error);
      throw error;
    }
  },
};

export default EncounterService;
