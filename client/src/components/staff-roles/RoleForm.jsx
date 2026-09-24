import { useState } from "react";
import Button from "../ui/button";

export default function RoleForm({ role = { name: "", permissions: [] }, onSubmit, permissions, isRestrictedPermission }) {
  const [formState, setFormState] = useState(role);

  const handlePermissionChange = (permission, isChecked) => {
    setFormState((prev) => ({
      ...prev,
      permissions: isChecked
        ? [...prev.permissions, permission]
        : prev.permissions.filter(
            (p) =>
              p.entity !== permission.entity ||
              p.action !== permission.action ||
              p.scope !== permission.scope
          ),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formState);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Role Name"
        value={formState.name}
        onChange={(e) => setFormState({ ...formState, name: e.target.value })}
        className="border p-2 rounded w-full mb-4"
      />
      <h3 className="text-md font-semibold mb-2">Permissions</h3>
      <div className="max-h-60 overflow-y-auto mb-4 p-2 border rounded">
        {permissions &&
          permissions
            .filter((perm) => !isRestrictedPermission(perm))
            .map((permission, index) => {
              const isChecked = formState.permissions.some(
                (p) =>
                  p.entity === permission.entity &&
                  p.action === permission.action &&
                  p.scope === permission.scope
              );
              return (
                <label key={index} className="block mb-1 p-1 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) =>
                      handlePermissionChange(permission, e.target.checked)
                    }
                    className="mr-2"
                  />
                  {`${permission.entity} - ${permission.action} - ${permission.scope}`}
                </label>
              );
            })}
      </div>
      <Button type="submit" className="w-full">
        {role._id ? "Save Changes" : "Create Role"}
      </Button>
    </form>
  );
}