import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const data = {
  "PBMH": {
    "A BLOCK": [
      "OBSTETRICS AND GYNAECOLOGY", "OPHTHALMOLOGY", "DERMATOLOGY", "PAEDIATRICS", "PAEDIATRIC SURGERY", "RETINA CLINIC", "NEONATOLOGY", "REPRODUCTIVE MEDICINE"
    ],
    "B&C (MB) BLOCK": [
      "NEUROSURGERY", "GENERAL MEDICINE", "MEDICAL GASTROENTEROLOGY", "GENERAL SURGERY", "ORTHOPAEDICS", "UROLOGY", "ENDOCRINOLOGY", "CARDIOTHORACIC AND VASCULAR SURGERY", "NEUROLOGY", "CARDIOLOGY", "CLINICAL IMMUNOLOGY AND RHEUMATOLOGY", "EAR NOSE AND THROAT", "PULMONARY MEDICINE", "PLASTIC SURGERY", "PSYCHIATRY", "HAEMATOLOGY", "NEPHROLOGY", "SURGICAL GASTROENTEROLOGY", "ENDOCRINE AND BREAST SURGERY"
    ]
  },
  "SSCC": {
    "KSS": [
      "HAEMATOLOGY", "NEPHROLOGY", "NEUROSURGERY", "PULMONARY MEDICINE", "ORTHOPAEDICS", "NEUROLOGY", "GENERAL MEDICINE", "CARDIOTHORACIC AND VASCULAR SURGERY", "PLASTIC SURGERY", "ENDOCRINOLOGY", "CARDIOLOGY", "UROLOGY", "SPINE AND ORTHO SURGERY", "GENERAL SURGERY", "OPHTHALMOLOGY", "CLINICAL IMMUNOLOGY AND RHEUMATOLOGY", "PSYCHIATRY", "OBSTETRICS AND GYNAECOLOGY"
    ],
    "KCC": [
      "MEDICAL ONCOLOGY", "RADIATION ONCOLOGY", "SURGICAL ONCOLOGY", "MEDICAL GASTROENTEROLOGY", "EAR NOSE AND THROAT", "SURGICAL GASTROENTEROLOGY"
    ]
  },
  "KIDS": {
    "DENTAL": [
      "ORAL MEDICINE AND RADIOLOGY", "PAEDIATRIC AND PREVENTIVE DENTISTRY", "ORAL AND MAXILLOFACIAL SURGERY", "ORAL PATHOLOGY AND MICROBIOLOGY", "PERIODONTOLOGY", "PROSTHODONTICS AND CROWN AND BRIDGE", "ORTHODONTICS AND DENTOFACIAL ORTHOPAEDICS", "CONSERVATIVE DENTISTRY AND ENDODONTICS", "PUBLIC HEALTH DENTISTRY"
    ]
  }
};

function generateSlug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function run() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'digital_signage',
    });

    console.log('Connected to database. Starting cleanup...');

    // Disable foreign key checks temporarily to allow TRUNCATE
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    
    await connection.query('TRUNCATE TABLE departments;');
    await connection.query('TRUNCATE TABLE locations;');
    await connection.query('TRUNCATE TABLE branches;');
    
    // TRUNCATE associative tables to be safe, although cascade/truncate on parent might handle it (but MySQL TRUNCATE doesn't cascade, so we must truncate children manually)
    await connection.query('TRUNCATE TABLE doctor_assignments;');
    await connection.query('TRUNCATE TABLE doctor_branch_location;');
    await connection.query('TRUNCATE TABLE doctor_departments;');
    await connection.query('TRUNCATE TABLE user_branches;');
    await connection.query('TRUNCATE TABLE user_locations;');
    await connection.query('TRUNCATE TABLE user_departments;');

    // Truncate display playlists as well as they rely on exact location IDs
    await connection.query('TRUNCATE TABLE display_playlist_step_exclude_departments;');
    await connection.query('TRUNCATE TABLE display_playlist_step_locations;');
    await connection.query('TRUNCATE TABLE display_playlist_steps;');
    await connection.query('TRUNCATE TABLE display_playlists;');

    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('Cleanup completed. Starting insertion...');

    for (const [branchName, locationsData] of Object.entries(data)) {
      // Insert branch
      const [bResult] = await connection.query(
        'INSERT INTO branches (name, slug, status) VALUES (?, ?, 1)',
        [branchName, generateSlug(branchName)]
      );
      const branchId = bResult.insertId;
      console.log(`Inserted Branch: ${branchName} (ID: ${branchId})`);

      for (const [locationName, departmentsData] of Object.entries(locationsData)) {
        // Insert location
        const [lResult] = await connection.query(
          'INSERT INTO locations (branch_id, name, slug, status) VALUES (?, ?, ?, 1)',
          [branchId, locationName, generateSlug(locationName)]
        );
        const locationId = lResult.insertId;
        console.log(`  Inserted Location: ${locationName} (ID: ${locationId})`);

        for (const deptName of departmentsData) {
          // Insert department
          await connection.query(
            'INSERT INTO departments (branch_id, location_id, name, status) VALUES (?, ?, ?, 1)',
            [branchId, locationId, deptName]
          );
          console.log(`    Inserted Department: ${deptName}`);
        }

        // Insert default display playlist for this location
        const [pResult] = await connection.query(
          'INSERT INTO display_playlists (screen_branch_id, screen_location_id) VALUES (?, ?)',
          [branchId, locationId]
        );
        const playlistId = pResult.insertId;

        // Insert a default step to show doctors from this location
        const [sResult] = await connection.query(
          'INSERT INTO display_playlist_steps (playlist_id, step_order, title, duration_seconds) VALUES (?, 1, ?, 10)',
          [playlistId, 'All Departments']
        );
        const stepId = sResult.insertId;

        // Map the step to the location
        await connection.query(
          'INSERT INTO display_playlist_step_locations (step_id, location_id) VALUES (?, ?)',
          [stepId, locationId]
        );
        console.log(`  Created default playlist for Location: ${locationName}`);
      }
    }

    console.log('Hierarchy seeding completed successfully!');
    
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    if (connection) await connection.end();
  }
}

run();
