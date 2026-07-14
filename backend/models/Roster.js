/**
 * Roster model - maps a database roster row to an application object.
 */
export class Roster {
  constructor(row) {
    this.roster_id = row.roster_id;
    this.date = row.date;
    this.timing = row.timing;
    this.doctor_id = row.doctor_id;
    this.employee_id = row.employee_id;
    this.doctor_name = row.doctor_name;
    this.designation = row.designation;
    this.photo_url = row.photo_url;
    this.branch = row.branch;
    this.location = row.location;
    this.department_name = row.department_name;
  }

  toPublic() {
    return {
      roster_id: this.roster_id,
      date: this.date,
      timing: this.timing,
      doctor_id: this.doctor_id,
      employee_id: this.employee_id,
      doctor_name: this.doctor_name,
      designation: this.designation,
      photo_url: this.photo_url,
      branch: this.branch,
      location: this.location,
      department_name: this.department_name,
    };
  }
}
