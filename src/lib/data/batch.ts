const VARIANT_URL = "http://localhost:9090/v1/variants";
const HG19_BATCH_URL = "/api/hg19/batch-annotation";

export async function sendBatchAnnotation(formData: FormData) {
  const url = VARIANT_URL;
  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  return res;
}

export async function sendHg19BatchAnnotation(formData: FormData) {
  const res = await fetch(HG19_BATCH_URL, {
    method: "POST",
    body: formData,
  });

  return res;
}