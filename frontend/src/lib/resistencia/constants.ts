export const VAM_TEST_LABELS: Record<string, string> = {
  vam_2000m: "VAM 2000 m",
  vam_5min: "VAM 5 minutos",
  test_30_15_ift: "30-15 IFT",
  yoyo_ri1: "Yo-Yo Test RI1",
  speed_test: "Test de Velocidad",
};

export function formatTestTypeLabel(testType: string): string {
  return VAM_TEST_LABELS[testType] ?? testType.replace(/_/g, " ");
}

export function getBestTestMetricLabel(testType: string): string {
  return testType === "speed_test" ? "Mejor Test de Velocidad" : "Mejor VAM";
}

export function getLatestTestMetricLabel(testType: string): string {
  return testType === "speed_test" ? "Último Test de Velocidad" : "Última VAM";
}
