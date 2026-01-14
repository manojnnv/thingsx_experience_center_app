/**
 * Attendance Services
 * 
 * Handles all API calls related to worker attendance tracking.
 * Uses face recognition for check-in/check-out.
 * 
 * @fileoverview Attendance-related API service functions
 */

import { api } from "@/app/utils/api";
import { getSiteId, getOrgId } from "@/config/site";

// ===========================================
// Types
// ===========================================

export interface AttendanceRecord {
  person_id: string;
  person_name: string;
  check_in: string;
  check_out: string | null;
  delta_time: number; // in minutes
  status: "present" | "absent" | "late";
  photo_url?: string;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  late: number;
  absent: number;
  avgCheckInTime: string;
  avgWorkHours: number;
}

export interface PersonDetails {
  person_id: string;
  person_name: string;
  email: string;
  phone: string;
  tags: string;
  zones: string[];
  created_at: string;
}

// ===========================================
// Attendance Report APIs
// ===========================================

/**
 * Fetch attendance report for a date range
 */
async function fetchAttendanceReport(
  siteId: string,
  startDate?: string,
  endDate?: string
): Promise<{ data: AttendanceRecord[] | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/metrics/attendance_report_dualcamera", {
      site_id: siteId || getSiteId(),
      from_date: startDate,
      to_date: endDate,
    });
    return { data: resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error fetching attendance report:", error);
    return { data: null, error: "Failed to fetch attendance data" };
  }
}

/**
 * Get attendance summary statistics
 */
async function getAttendanceSummary(
  siteId: string,
  date: string
): Promise<{ data: AttendanceSummary | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/metrics/attendance_summary", {
      site_id: siteId || getSiteId(),
      date: date,
    });
    return { data: resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error fetching attendance summary:", error);
    return { data: null, error: "Failed to fetch attendance summary" };
  }
}

// ===========================================
// Person Management APIs
// ===========================================

/**
 * Retrieve all registered persons
 */
async function retrieveAllPeople(siteId: string): Promise<{ data: PersonDetails[] | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/zones/retrieve_person", {
      site_id: siteId || getSiteId(),
    });
    return { data: resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error retrieving people:", error);
    return { data: null, error: "Failed to retrieve people" };
  }
}

/**
 * Add a new person with face images
 */
async function addPerson(data: {
  name: string;
  email: string;
  tag: string;
  images: string[];
  isPortal: boolean;
  password: string;
  countryCode: string;
  phone: string;
  policy: boolean;
}): Promise<{ data: { person_id: string } | null; error: string | null }> {
  try {
    const formData = new FormData();
    formData.append("person_name", data.name);
    formData.append("org_id", getOrgId());
    formData.append("tags", data.tag);
    formData.append("created_by", localStorage.getItem("user_id") || "1");
    formData.append("site_id", getSiteId());
    formData.append("email_id", data.email);
    formData.append("login_flag", data.isPortal ? "y" : "n");
    formData.append("password", data.password);
    formData.append("tele_country_code", data.countryCode);
    formData.append("phone", data.phone);
    formData.append("policy", data.policy ? "y" : "n");
    data.images.forEach((img) => {
      formData.append("images", img);
    });
    
    const resp = await api.post("/v1/zones/add_person", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return { data: resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error adding person:", error);
    return { data: null, error: "Failed to add person" };
  }
}

/**
 * Update person details
 */
async function updatePerson(data: {
  personId: string;
  name: string;
  role: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const resp = await api.post("/v1/zones/update_person", {
      person_id: data.personId,
      person_name: data.name,
      tags: data.role,
    });
    return { success: resp?.data?.status === "success", error: null };
  } catch (error) {
    console.error("Error updating person:", error);
    return { success: false, error: "Failed to update person" };
  }
}

/**
 * Delete a person
 */
async function deletePerson(
  siteId: string,
  personId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const resp = await api.post("/v1/zones/delete_person", {
      site_id: siteId || getSiteId(),
      person_id: personId,
    });
    return { success: resp?.data?.status === "success", error: null };
  } catch (error) {
    console.error("Error deleting person:", error);
    return { success: false, error: "Failed to delete person" };
  }
}

// ===========================================
// Zone-People Mapping APIs
// ===========================================

/**
 * Assign people to zones
 */
async function assignPeopleToZone(
  zones: string | string[],
  personIds?: string | string[]
): Promise<{ success: boolean; error: string | null }> {
  try {
    const zoneList = Array.isArray(zones) ? zones : [zones];
    const personList = personIds
      ? Array.isArray(personIds)
        ? personIds
        : [personIds]
      : localStorage.getItem("person_Id")
      ? [String(localStorage.getItem("person_Id"))]
      : [];

    const authorizations: Record<string, string[]> = {};
    zoneList.forEach((zone) => {
      authorizations[zone] = personList;
    });

    const resp = await api.post("/v1/zones/zone_people_mapping", {
      authorizations,
      site_id: getSiteId(),
    });
    return { success: resp?.data?.status === "success", error: null };
  } catch (error) {
    console.error("Error assigning people to zone:", error);
    return { success: false, error: "Failed to assign people" };
  }
}

/**
 * Retrieve zones with their mapped people
 */
async function retrieveZonesWithPeople(siteId: string): Promise<{ data: { zone_id: string; zone_name: string; people: PersonDetails[] }[] | null; error: string | null }> {
  try {
    const resp = await api.post("/v1/zones/retrieve_zones_with_people", {
      site_id: siteId || getSiteId(),
    });
    return { data: resp?.data?.data, error: null };
  } catch (error) {
    console.error("Error retrieving zones with people:", error);
    return { data: null, error: "Failed to retrieve zones" };
  }
}

export {
  // Attendance
  fetchAttendanceReport,
  getAttendanceSummary,
  // Person Management
  retrieveAllPeople,
  addPerson,
  updatePerson,
  deletePerson,
  // Zone Mapping
  assignPeopleToZone,
  retrieveZonesWithPeople,
};
