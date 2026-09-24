import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Search, Plus, Filter } from "lucide-react"
import Button from "../../components/ui/button"
import Input from "../../components/ui/input"
import Badge from "../../components/ui/badge"
import Avatar from "../../components/ui/avatar"
import { useHoverPanel } from "../../context/HoverPanelContext"
import { useEncounterContext } from "../../context/EncounterContext"
import CreateEncounterForm from "../../components/record/CreateEncounterForm"
import HoverPanel from "../../components/ui/hover-panel"

export default function EncountersByRecordPage() {
  const { id: recordId } = useParams();
  const { encounters, loading, error, getEncountersByRecordId, deleteEncounter } = useEncounterContext();
  const navigate = useNavigate();
  const { openPanel } = useHoverPanel();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (recordId) {
      getEncountersByRecordId(recordId);
    }
  }, [getEncountersByRecordId, recordId]);

  const handleAddEncounter = () => {
    openPanel("Add New Encounter", <CreateEncounterForm onSuccess={handleEncounterAdded} />);
  }

  const handleEncounterClick = (encounter) => {
    // Open the hover panel with the encounter details for editing
    openPanel("Edit Encounter", <CreateEncounterForm encounter={encounter} onSuccess={handleEncounterAdded} />);
  };

  const handleEncounterAdded = () => {
    console.log("Encounter added or updated successfully");
    // No need to refresh - the context state is already updated
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Prevent card click when clicking delete button
    try {
      await deleteEncounter(id);
      // No need to refresh - the context state is already updated
    } catch (error) {
      console.error("Error deleting encounter:", error);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Scheduled":
        return <Badge variant="primary">Scheduled</Badge>
      case "Completed":
        return <Badge variant="success">Completed</Badge>
      case "Pending":
        return <Badge variant="default">Pending</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading encounter records...</div>
  }

  if (error) {
    return <div className="bg-red-100 text-red-800 p-4 rounded">{error}</div>
  }

  // Filter encounters based on search term if provided
  const filteredEncounters = searchTerm
    ? encounters.filter(encounter => 
        encounter.reasonForEncounter?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        encounter.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()))
    : encounters;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Encounters</h1>
          <Button
            variant="primary"
            onClick={handleAddEncounter}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            New Encounter
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search encounters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <Button
            variant="secondary"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </div>
      </div>

      {filteredEncounters.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-500">No encounters found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredEncounters.map((encounter) => (
            <div
              key={encounter._id}
              onClick={() => handleEncounterClick(encounter)}
              className="group p-4 rounded-xl border border-gray-200 bg-white hover:shadow-lg hover:border-primary-100 transition-all duration-200 cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg text-gray-900 group-hover:text-primary-600">
                    {encounter.reasonForEncounter}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(encounter.dateTime).toLocaleString()}
                  </p>
                </div>
                {getStatusBadge(encounter.status)}
              </div>
              <p className="mt-2 text-gray-600">{encounter.diagnosis}</p>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={(e) => handleDelete(encounter._id, e)}
                  className="text-sm text-red-500 hover:text-red-700 transition-colors duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}