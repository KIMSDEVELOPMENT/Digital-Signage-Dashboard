import { config } from "dotenv";
config({ path: "./backend/.env" });
import fs from "fs";
import * as xlsx from "xlsx";
import { getPool, initializePool } from "./backend/config/db.js";
import doctorRepository from "./backend/repositories/DoctorRepository.js";
import branchRepository from "./backend/repositories/BranchRepository.js";
import locationRepository from "./backend/repositories/LocationRepository.js";
import departmentRepository from "./backend/repositories/DepartmentRepository.js";

async function test() {
  await initializePool();
  try {
    const allBranches = await branchRepository.findAll();
    console.log("Branches:", allBranches.length);
    const allLocations = await locationRepository.findAll();
    console.log("Locations:", allLocations.length);
    const allDepts = await departmentRepository.findAll();
    console.log("Depts:", allDepts.length);
    console.log("SUCCESS");
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
test();
