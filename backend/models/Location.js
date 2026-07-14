/**
 * Location model - maps a database locations row to an application object.
 */
export class Location {
  constructor(row) {
    this.id = row.id;
    this.branch_id = row.branch_id;
    this.name = row.name;
    this.status = row.status;
    this.created_at = row.created_at;
    this.updated_at = row.updated_at;
    this.branch_name = row.branch_name || null;
  }

  toPublic() {
    return {
      id: this.id,
      branch_id: this.branch_id,
      name: this.name,
      status: !!this.status,
      created_at: this.created_at,
      updated_at: this.updated_at,
      branch_name: this.branch_name,
    };
  }
}
