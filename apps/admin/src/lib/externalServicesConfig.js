export async function loadExternalServices(api) {
  const res = await api.listExternalServices();
  return res.data || { services: [] };
}

export async function loadExternalService(api, service) {
  const res = await api.getExternalService(service);
  return res.data;
}

export async function saveExternalServiceFlags(api, service, flags) {
  const res = await api.patchExternalService(service, flags);
  return res.data;
}

export async function saveExternalCredentials(api, service, fields, runTest = true) {
  const res = await api.putExternalCredentials(service, { fields, run_test: runTest });
  return res.data;
}

export async function testExternalService(api, service) {
  const res = await api.testExternalService(service);
  return res.data;
}
