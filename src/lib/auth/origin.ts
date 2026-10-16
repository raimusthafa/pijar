/** Public origin of a request, honouring the reverse proxy (nginx sets Host and X-Forwarded-Proto). */
export function publicOrigin(request: Request): string {
  const url = new URL(request.url);
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || url.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host') || url.host;
  return `${proto}://${host}`;
}
