import { getPool } from '../config/db.js';

export const getScreenPlaylist = async (req, res) => {
  try {
    const pool = getPool();
    const { branchSlug, locationSlug } = req.params;

    // 1. Resolve Slugs to IDs
    const [screenQuery] = await pool.query(
      `SELECT b.id AS branch_id, b.name AS branch_name, l.id AS location_id, l.name AS location_name
       FROM branches b
       JOIN locations l ON l.branch_id = b.id
       WHERE b.slug = ? AND l.slug = ?`,
      [branchSlug, locationSlug]
    );

    if (screenQuery.length === 0) {
      return res.status(404).json({ message: 'Screen location not found' });
    }

    const { branch_id, location_id, branch_name, location_name } = screenQuery[0];

    // 2. Fetch Playlist Configuration
    const [playlistQuery] = await pool.query(
      `SELECT id FROM display_playlists WHERE screen_branch_id = ? AND screen_location_id = ?`,
      [branch_id, location_id]
    );

    if (playlistQuery.length === 0) {
      // Return empty steps if no playlist is configured
      return res.json({
        branch: branch_name,
        location: location_name,
        steps: []
      });
    }

    const playlistId = playlistQuery[0].id;

    // 3. Fetch Steps
    const [stepsQuery] = await pool.query(
      `SELECT id, title, duration_seconds 
       FROM display_playlist_steps 
       WHERE playlist_id = ? 
       ORDER BY step_order ASC`,
      [playlistId]
    );

    const steps = [];

    // 4. For each step, fetch the grouped doctors
    for (const step of stepsQuery) {
      const stepId = step.id;

      // Get associated locations
      const [locations] = await pool.query(
        `SELECT location_id FROM display_playlist_step_locations WHERE step_id = ?`,
        [stepId]
      );
      const locationIds = locations.map(l => l.location_id);

      if (locationIds.length === 0) {
        steps.push({
          title: step.title,
          duration: step.duration_seconds,
          departments: []
        });
        continue;
      }

      // Get excluded departments
      const [excludedDepts] = await pool.query(
        `SELECT department_id FROM display_playlist_step_exclude_departments WHERE step_id = ?`,
        [stepId]
      );
      const excludedDeptIds = excludedDepts.map(d => d.department_id);

      // Fetch Doctors scheduled for today (CURRENT_DATE) in those locations
      let doctorQuery = `
        SELECT d.id, d.name, d.designation, d.photo_url, dept.name AS department_name, r.timing
        FROM roster r
        JOIN doctors d ON r.doctor_id = d.id
        JOIN doctor_assignments da ON da.doctor_id = d.id 
             AND da.branch_id = r.branch_id 
             AND da.location_id = r.location_id
        JOIN departments dept ON da.department_id = dept.id
        WHERE r.date = CURRENT_DATE
          AND r.location_id IN (?)
      `;
      const queryParams = [locationIds];

      if (excludedDeptIds.length > 0) {
        doctorQuery += ` AND da.department_id NOT IN (?)`;
        queryParams.push(excludedDeptIds);
      }

      doctorQuery += ` ORDER BY dept.name ASC, d.name ASC`;

      const [doctorsData] = await pool.query(doctorQuery, queryParams);

      // Group by department
      const grouped = {};
      for (const doc of doctorsData) {
        if (!grouped[doc.department_name]) {
          grouped[doc.department_name] = {
            name: doc.department_name,
            doctors: []
          };
        }
        grouped[doc.department_name].doctors.push({
          id: doc.id,
          name: doc.name,
          designation: doc.designation,
          timing: doc.timing,
          photo_url: doc.photo_url
        });
      }

      steps.push({
        title: step.title,
        duration: step.duration_seconds,
        departments: Object.values(grouped)
      });
    }

    // 5. Fetch Video if exists for this branch & location
    const [videoQuery] = await pool.query(
      `SELECT file_path, duration FROM videos WHERE branch_id = ? AND location_id = ?`,
      [branch_id, location_id]
    );

    const video = videoQuery.length > 0 ? {
      url: videoQuery[0].file_path,
      duration: videoQuery[0].duration
    } : null;

    res.json({
      branch: branch_name,
      location: location_name,
      steps,
      video
    });

  } catch (error) {
    console.error('Error fetching screen playlist:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
