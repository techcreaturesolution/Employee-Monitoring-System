# Implementation Plan - Project CRUD and Deadline Display

This plan outlines the changes required to display project deadlines clearly, and support editing and deleting of projects directly from the dashboard card.

## Proposed Changes

### 1. API Services

#### [MODIFY] [api.ts](file:///d:/Tech%20Creature%20Solution/admin-portal/src/services/api.ts)
- Add the `delete` method to the `projectAPI` service object:
  ```typescript
  delete: (id: string) => api.delete(`/projects/${id}`),
  ```

---

### 2. Projects Dashboard

#### [MODIFY] [Projects.tsx](file:///d:/Tech%20Creature%20Solution/admin-portal/src/pages/Projects.tsx)
- **Imports**: Import `Edit2` and `Trash2` from `lucide-react` for the project action buttons.
- **State Management**:
  - Add `editingId` to track which project is currently being edited.
  - Update `form` state to include `status` field:
    ```typescript
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', description: '', deadline: '', status: 'active' });
    ```
- **Helper Methods**:
  - Add `resetForm` helper to clear form state and `editingId`.
  - Add `formatDateForDisplay` and `formatDateForInput` to robustly format dates.
- **Action Handlers**:
  - Modify `handleCreate` to handle both edit/update (`projectAPI.update`) and creation (`projectAPI.create`).
  - Add `handleEdit(project)` to populate form state and open modal.
  - Add `handleDelete(id)` to confirm and call `projectAPI.delete`.
- **Card UI**:
  - If the user is admin (`isAdmin`), render Edit and Delete buttons on the top right of each project card.
  - Display the deadline formatted using `formatDateForDisplay` if it exists.
- **Modal Form UI**:
  - Update the modal title dynamically (`Edit Project` or `New Project`).
  - If `editingId` is set, render a `Status` dropdown (Active / Completed).
  - Update Submit button text dynamically (`Save Changes` or `Create`).

## Verification Plan

### Automated Tests
- Run `npm run build` to verify there are no TypeScript compile-time errors.

### Manual Verification
- Run the dev server `npm run dev`.
- Add a new project with a deadline, verify it renders on the card.
- Edit the project (name, description, deadline, status), verify updates are shown.
- Delete the project, verify it is removed from the card list.
