/**
 * Doctor model - maps a database doctor row to an application object.
 */
export class Doctor {
  constructor(row) {
    this.id = row.id;
    this.employee_id = row.employee_id;
    this.name = row.name;
    this.designation = row.designation;
    this.department_id = row.department_id;
    this.department_name = row.department_name || null;
    this.branch = row.branch;
    this.location = row.location;
    this.photo_url = row.photo_url;
    this.created_at = row.created_at;
  }

  toPublic() {
    return {
      id: this.id,
      employee_id: this.employee_id,
      name: this.name,
      designation: this.designation,
      department_id: this.department_id,
      department_name: this.department_name,
      branch: this.branch,
      location: this.location,
      photo_url: this.photo_url,
      created_at: this.created_at,
    };
  }
}
