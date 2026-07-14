/**
 * User model - maps a database user row to an application object.
 */
export class User {
  constructor(row) {
    this.id = row.id;
    this.employee_id = row.employee_id || null;
    this.full_name = row.full_name;
    this.username = row.username;
    this.password = row.password;
    this.role = row.role;
    this.created_at = row.created_at;
  }

  /** Returns a safe public view without the password hash */
  toPublic() {
    return {
      id: this.id,
      employee_id: this.employee_id,
      full_name: this.full_name,
      username: this.username,
      role: this.role,
      created_at: this.created_at,
    };
  }
}
