/**
 * Department model - maps a database department row to an application object.
 */
export class Department {
  constructor(row) {
    this.id = row.id;
    this.branch_id = row.branch_id;
    this.location_id = row.location_id;
    this.name = row.name;
    this.status = row.status;
    this.created_at = row.created_at;
    this.updated_at = row.updated_at;
    this.branch_name = row.branch_name || null;
    this.location_name = row.location_name || null;
    this.assigned_doctors_count = Number(row.assigned_doctors_count || 0);
  }

  toPublic() {
    return {
      id: this.id,
      branch_id: this.branch_id,
      location_id: this.location_id,
      name: this.name,
      status: !!this.status,
      created_at: this.created_at,
      updated_at: this.updated_at,
      branch_name: this.branch_name,
      location_name: this.location_name,
      branch: this.branch_name, // fallback for legacy views
      assigned_doctors_count: this.assigned_doctors_count,
    };
  }
}
