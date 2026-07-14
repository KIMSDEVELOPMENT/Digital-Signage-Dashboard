/**
 * Department model - maps a database department row to an application object.
 */
export class Department {
  constructor(row) {
    this.id = row.id;
    this.name = row.name;
    this.branch = row.branch || null;
    this.created_at = row.created_at;
  }

  toPublic() {
    return {
      id: this.id,
      name: this.name,
      branch: this.branch,
      created_at: this.created_at,
    };
  }
}
