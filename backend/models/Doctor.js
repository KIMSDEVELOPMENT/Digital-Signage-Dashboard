export class Doctor {
  constructor(row) {
    this.id = row.id;
    this.employee_id = row.employee_id;
    this.name = row.name;
    this.designation = row.designation;
    this.photo_url = row.photo_url;
    this.status = row.status;
    this.created_at = row.created_at;
    this.updated_at = row.updated_at;
    
    // Parse JSON assignments if provided by MySQL JSON_ARRAYAGG
    let parsedAssignments = [];
    if (typeof row.assignments === 'string') {
      try {
        parsedAssignments = JSON.parse(row.assignments);
        // Sometimes MySQL JSON_ARRAYAGG returns an array with a single null element if there are no joins
        if (parsedAssignments.length === 1 && parsedAssignments[0].id === null) {
          parsedAssignments = [];
        }
      } catch (e) {
        parsedAssignments = [];
      }
    } else if (Array.isArray(row.assignments)) {
      parsedAssignments = row.assignments;
      if (parsedAssignments.length === 1 && parsedAssignments[0].id === null) {
        parsedAssignments = [];
      }
    }
    
    this.assignments = parsedAssignments;
  }

  toPublic() {
    return {
      id: this.id,
      employee_id: this.employee_id,
      name: this.name,
      designation: this.designation,
      photo_url: this.photo_url,
      status: !!this.status,
      created_at: this.created_at,
      updated_at: this.updated_at,
      assignments: this.assignments
    };
  }
}
