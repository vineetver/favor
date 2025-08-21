const VARIANT_URL = "http://localhost:9090/v1/variants";

export async function sendBatchAnnotation(formData: FormData) {
  const url = VARIANT_URL;
  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  return res;
}