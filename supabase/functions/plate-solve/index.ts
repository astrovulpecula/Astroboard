// Astrometry.net plate-solving proxy edge function.
// Accepts either a base64 image or a public image URL, submits it to
// nova.astrometry.net, polls for the solved job, and returns identified
// deep-sky objects plus an annotated image URL.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const API = "https://nova.astrometry.net/api";

async function login(apikey: string): Promise<string> {
  const body = new URLSearchParams({
    "request-json": JSON.stringify({ apikey }),
  });
  const res = await fetch(`${API}/login`, { method: "POST", body });
  const json = await res.json();
  if (json.status !== "success") {
    throw new Error("Astrometry login falló: " + JSON.stringify(json));
  }
  return json.session as string;
}

async function urlUpload(session: string, url: string): Promise<number> {
  const body = new URLSearchParams({
    "request-json": JSON.stringify({
      session,
      url,
      publicly_visible: "n",
      allow_modifications: "n",
      allow_commercial_use: "n",
    }),
  });
  const res = await fetch(`${API}/url_upload`, { method: "POST", body });
  const json = await res.json();
  if (json.status !== "success") {
    throw new Error("Astrometry url_upload falló: " + JSON.stringify(json));
  }
  return json.subid as number;
}

async function fileUpload(
  session: string,
  bytes: Uint8Array,
  filename: string,
): Promise<number> {
  const boundary = "----lovable" + Math.random().toString(36).slice(2);
  const enc = new TextEncoder();
  const reqJson = JSON.stringify({
    session,
    publicly_visible: "n",
    allow_modifications: "n",
    allow_commercial_use: "n",
  });
  const head1 = enc.encode(
    `--${boundary}\r\nContent-Disposition: form-data; name="request-json"\r\n\r\n${reqJson}\r\n`,
  );
  const head2 = enc.encode(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
  );
  const tail = enc.encode(`\r\n--${boundary}--\r\n`);
  const total = head1.length + head2.length + bytes.length + tail.length;
  const combined = new Uint8Array(total);
  let o = 0;
  combined.set(head1, o); o += head1.length;
  combined.set(head2, o); o += head2.length;
  combined.set(bytes, o); o += bytes.length;
  combined.set(tail, o);
  const res = await fetch(`${API}/upload`, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body: combined,
  });
  const json = await res.json();
  if (json.status !== "success") {
    throw new Error("Astrometry upload falló: " + JSON.stringify(json));
  }
  return json.subid as number;
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollSubmission(subid: number, deadline: number): Promise<number> {
  while (Date.now() < deadline) {
    const res = await fetch(`${API}/submissions/${subid}`);
    const j = await res.json();
    const jobs = Array.isArray(j.jobs) ? j.jobs : [];
    if (jobs.length && jobs[0] != null) return jobs[0] as number;
    await wait(3000);
  }
  throw new Error("Timeout esperando asignación de job");
}

async function pollJob(jobid: number, deadline: number): Promise<void> {
  while (Date.now() < deadline) {
    const res = await fetch(`${API}/jobs/${jobid}`);
    const j = await res.json();
    if (j.status === "success") return;
    if (j.status === "failure") throw new Error("Plate solve falló");
    await wait(3000);
  }
  throw new Error("Timeout esperando resolución de job");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const apikey = Deno.env.get("ASTROMETRY_API_KEY");
    if (!apikey) throw new Error("ASTROMETRY_API_KEY no configurada");

    const payload = await req.json().catch(() => ({}));
    const { imageBase64, imageUrl, filename } = payload as {
      imageBase64?: string;
      imageUrl?: string;
      filename?: string;
    };
    if (!imageBase64 && !imageUrl) {
      throw new Error("Falta imageBase64 o imageUrl");
    }

    const deadline = Date.now() + 110_000;
    const session = await login(apikey);

    let subid: number;
    if (imageBase64) {
      const clean = imageBase64.includes(",")
        ? imageBase64.split(",")[1]
        : imageBase64;
      const bin = atob(clean);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      subid = await fileUpload(session, bytes, filename || "final.jpg");
    } else {
      subid = await urlUpload(session, imageUrl!);
    }

    const jobid = await pollSubmission(subid, deadline);
    await pollJob(jobid, deadline);

    const [calibRes, objsRes] = await Promise.all([
      fetch(`${API}/jobs/${jobid}/calibration/`).then((r) => r.json()).catch(() => null),
      fetch(`${API}/jobs/${jobid}/objects_in_field/`).then((r) => r.json()).catch(() => null),
    ]);

    const objects: string[] = Array.isArray(objsRes?.objects_in_field)
      ? objsRes.objects_in_field
      : [];

    return new Response(
      JSON.stringify({
        jobid,
        subid,
        calibration: calibRes,
        objects,
        annotatedUrl: `https://nova.astrometry.net/annotated_full/${jobid}`,
        analyzedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});