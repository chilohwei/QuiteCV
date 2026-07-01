import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const workerPath = resolve(".open-next/worker.js");
const marker = "const QUIETCV_SECURITY_HEADERS =";

let source = readFileSync(workerPath, "utf8");

if (source.includes(marker)) {
  process.exit(0);
}

const helper = `const QUIETCV_SECURITY_HEADERS = [
    ["X-Content-Type-Options", "nosniff"],
    ["Referrer-Policy", "strict-origin-when-cross-origin"],
    ["X-Frame-Options", "DENY"],
    [
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    ],
    [
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://tongji.chiloh.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; worker-src 'self' blob:; connect-src 'self' https://tongji.chiloh.com https://*.vercel-insights.com https://vitals.vercel-insights.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    ],
];

function withQuietCvSecurityHeaders(response) {
    const headers = new Headers(response.headers);

    for (const [key, value] of QUIETCV_SECURITY_HEADERS) {
        headers.set(key, value);
    }

    headers.delete("X-Powered-By");
    headers.delete("x-powered-by");

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

`;

source = source.replace("export default {", `${helper}export default {`);
source = source.replace(
  "        return runWithCloudflareRequestContext(request, env, ctx, async () => {",
  "        const response = await runWithCloudflareRequestContext(request, env, ctx, async () => {",
);
source = source.replace(
  "        });\n    },\n};",
  "        });\n        return withQuietCvSecurityHeaders(response);\n    },\n};",
);

if (!source.includes(marker) || !source.includes("withQuietCvSecurityHeaders(response)")) {
  throw new Error("Unable to patch .open-next/worker.js security headers.");
}

writeFileSync(workerPath, source);
