/**
 * Branch model - maps a database branches row to an application object.
 */
export class Branch {
  constructor(row) {
    this.id = row.id;
    this.name = row.name;
    this.status = row.status;
    this.created_at = row.created_at;
    this.updated_at = row.updated_at;
  }

  toPublic() {
    return {
      id: this.id,
      name: this.name,
      status: !!this.status,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}
