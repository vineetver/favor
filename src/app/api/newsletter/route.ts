const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;

export async function POST(req: Request) {
  const formData = await req.formData();

  const response = await fetch(
    `https://api.mailgun.net/v3/lists/${MAILGUN_DOMAIN}/members`,
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa("api:" + MAILGUN_API_KEY),
      },
      body: formData,
    },
  );

  return response;
}
