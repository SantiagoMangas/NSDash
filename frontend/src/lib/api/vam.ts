import { get, post } from "@/lib/api/client";

export async function getVamTests(athleteId: number): Promise<any> {
  return get(`/athletes/${athleteId}/vam-tests`, { cache: "no-store" });
}

export async function getVamTest(testId: number): Promise<any> {
  return get(`/vam-tests/${testId}`, { cache: "no-store" });
}

export async function createVamTest(
  athleteId: number,
  date: string,
  testType: string,
  value1: number,
  value2: number | null,
  notes: string | null,
): Promise<any> {
  return post("/vam-tests", {
    athlete_id: athleteId,
    date,
    test_type: testType,
    value1,
    value2,
    notes,
  });
}
