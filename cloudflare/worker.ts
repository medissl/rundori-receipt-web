const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const fail = (status = 404) =>
      new Response("Unavailable", { status, headers });
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const expires = url.searchParams.get("expires") ?? "";
      const signature = url.searchParams.get("signature") ?? "";
      const now = Math.floor(Date.now() / 1000);
      if (
        !["GET", "PUT", "DELETE"].includes(request.method) ||
        !/^\/photos\/orders\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/(before|after)\/[a-f0-9-]{36}\.webp$/.test(
          path,
        ) ||
        !/^[a-f0-9]{64}$/.test(signature) ||
        !/^\d{10}$/.test(expires) ||
        Number(expires) <= now ||
        Number(expires) > now + 610
      )
        return fail();
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(env.PHOTO_GATEWAY_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"],
      );
      const bytes = new Uint8Array(
        signature.match(/.{2}/g)!.map((s) => parseInt(s, 16)),
      );
      if (
        !(await crypto.subtle.verify(
          "HMAC",
          key,
          bytes,
          new TextEncoder().encode(`${request.method}\n${path}\n${expires}`),
        ))
      )
        return fail();
      const objectKey = path.slice("/photos/".length);
      if (request.method === "GET") {
        const object = await env.PHOTOS.get(objectKey);
        if (!object) return fail();
        return new Response(object.body, {
          headers: { ...headers, "Content-Type": "image/webp" },
        });
      }
      if (request.method === "DELETE") {
        await env.PHOTOS.delete(objectKey);
        return new Response(null, { status: 204, headers });
      }
      const length = Number(request.headers.get("content-length") ?? 0);
      if (
        length < 1 ||
        length > 800000 ||
        request.headers.get("content-type") !== "image/webp"
      )
        return fail(400);
      // Payloads are bounded compressed images; reject chunked/unbounded requests.
      const body = await request.arrayBuffer();
      if (body.byteLength !== length) return fail(400);
      const view = new Uint8Array(body);
      const decoder = new TextDecoder();
      if (
        decoder.decode(view.slice(0, 4)) !== "RIFF" ||
        decoder.decode(view.slice(8, 12)) !== "WEBP"
      )
        return fail(400);
      await env.PHOTOS.put(objectKey, body, {
        httpMetadata: {
          contentType: "image/webp",
          cacheControl: "private, no-store",
        },
      });
      return new Response(null, { status: 204, headers });
    } catch {
      return fail(503);
    }
  },
} satisfies ExportedHandler<Env>;
