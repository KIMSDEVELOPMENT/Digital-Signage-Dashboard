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
    this.branch_id = row.branch_id;
    this.branch = row.branch || null; // string name from join
    this.location_id = row.location_id;
    this.location = row.location || null; // string name from join
    this.photo_url = row.photo_url;
    this.status = row.status;
    this.created_at = row.created_at;
    this.updated_at = row.updated_at;
  }

  toPublic() {
    return {
      id: this.id,
      employee_id: this.employee_id,
      name: this.name,
      designation: this.designation,
      department_id: this.department_id,
      department_name: this.department_name,
      branch_id: this.branch_id,
      branch: this.branch,
      location_id: this.location_id,
      location: this.location,
      photo_url: this.photo_url,
      status: !!this.status,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}
