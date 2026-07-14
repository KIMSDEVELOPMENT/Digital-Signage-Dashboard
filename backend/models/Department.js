/**
 * Department model - maps a database department row to an application object.
 */
export class Department {
  constructor(row) {
    this.id = row.id;
    this.name = row.name;
    this.created_at = row.created_at;
  }

  toPublic() {
    return {
      id: this.id,
      name: this.name,
      created_at: this.created_at,
    };
  }
}
