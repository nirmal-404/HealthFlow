// store/usePreRegistrationStore.js
import { create } from "zustand";
import {
  getPreRegisteredStaff,
  preRegisterStaff,
  deletePreRegisteredStaff,
} from "../services/PreRegistrationService";

const usePreRegistrationStore = create((set, get) => ({
  preRegistered: [],
  loading: false,
  error: null,

  fetchPreRegistered: async () => {
    try {
      set({ loading: true, error: null });
      const data = await getPreRegisteredStaff();
      set({ preRegistered: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  addPreRegistered: async (email, roleId) => {
    try {
      set({ loading: true, error: null });
      await preRegisterStaff(email, roleId);
      // Refresh the list after adding
      await get().fetchPreRegistered();
      set({ loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err; // Re-throw to handle in the component
    }
  },

  removePreRegistered: async (id) => {
    try {
      set({ loading: true, error: null });
      await deletePreRegisteredStaff(id);

      // Update the local state by removing the deleted pre-registration
      set((state) => ({
        preRegistered: state.preRegistered.filter((entry) => entry._id !== id),
        loading: false,
      }));
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err; // Re-throw for component handling
    }
  },

  clearError: () => set({ error: null }),
}));

export default usePreRegistrationStore;
