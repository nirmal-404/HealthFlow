import TokenService from "./TokenService";

const RecordService = {
  async createRecord(recordData) {
    try {
      console.log("[RecordService] Creating record with data:", recordData);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/records`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
        body: JSON.stringify(recordData),
      });

      if (!response.ok) {
        throw new Error("Failed to create record");
      }

      const data = await response.json();
      console.log("[RecordService] Record created:", data);
      return data.record;
    } catch (error) {
      console.error("[RecordService] Error creating record:", error);
      throw error;
    }
  },

  async fetchRecord(recordId) {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/records/${recordId}`,
        {
          headers: {
            Authorization: `Bearer ${TokenService.getAccessToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch record");
      }

      const data = await response.json();
      console.log("[RecordService] Record fetched:", data);
      return data;
    } catch (error) {
      console.error("[RecordService] Error fetching record:", error);
      throw error;
    }
  },

  async getRecordsByDoctor() {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/records/doctor`,
        {
          headers: {
            Authorization: `Bearer ${TokenService.getAccessToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get doctor records");
      }

      const data = await response.json();
      console.log("[RecordService] Doctor records fetched:", data);
      return data;
    } catch (error) {
      console.error("[RecordService] Error fetching doctor records:", error);
      throw error;
    }
  },

  async updateRecord(recordId, updatedData) {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/records/${recordId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TokenService.getAccessToken()}`,
          },
          body: JSON.stringify(updatedData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update record");
      }

      const data = await response.json();
      console.log("[RecordService] Record updated:", data);
      return data;
    } catch (error) {
      console.error("[RecordService] Error updating record:", error);
      throw error;
    }
  },

  async deleteRecord(recordId) {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/records/${recordId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${TokenService.getAccessToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete record");
      }

      console.log("[RecordService] Record deleted successfully");
      return true;
    } catch (error) {
      console.error("[RecordService] Error deleting record:", error);
      throw error;
    }
  },

  async getLinkRecord() {
    try {
      console.log("[RecordService] Fetching linked records");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/records/link`,
        {
          headers: {
            Authorization: `Bearer ${TokenService.getAccessToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get linked records");
      }

      const data = await response.json();
      console.log("[RecordService] Linked records fetched:", data);
      return data;
    } catch (error) {
      console.error("[RecordService] Error getting linked records:", error);
      throw error;
    }
  },
};

export default RecordService;
