import { useState } from "react";
import Button from "../ui/button";

export default function PreRegisterForm({ roles, onSubmit, isLoading }) {
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [error, setError] = useState("");

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    
    if (!email) {
      setError("Email is required");
      return;
    }
    
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    
    if (!roleId) {
      setError("Please select a role");
      return;
    }
    
    onSubmit(email, roleId);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="staff@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
            required
          />
        </div>
        
        <div>
          <label htmlFor="roleSelect" className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            id="roleSelect"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
            required
          >
            <option value="">Select a Role</option>
            {roles.map((role) => (
              <option key={role._id} value={role._id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
        
        <Button 
          type="submit" 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Assign Role"}
        </Button>
      </form>
      <p className="text-xs text-gray-500">
        This will assign the selected role to the email address. If the user exists, 
        they'll get this additional role. If not, they'll be pre-registered.
      </p>
    </div>
  );
}