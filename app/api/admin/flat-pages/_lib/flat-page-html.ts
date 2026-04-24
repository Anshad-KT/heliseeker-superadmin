function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function stripLeadingEmptyBlocks(html: string) {
  return html.replace(
    /^(?:\s|<p><br\s*\/?><\/p>|<p>\s*<\/p>|<br\s*\/?>)+/gi,
    "",
  )
}

function stripLeadingHeading(html: string) {
  return html.replace(/^<h1\b[^>]*>[\s\S]*?<\/h1>/i, "")
}

export function normalizeFlatPageHtml(title: string, html: string) {
  const cleanedTitle = title.trim()
  if (!cleanedTitle) return html

  let body = (html || "").trim()
  body = stripLeadingEmptyBlocks(body)
  body = stripLeadingHeading(body)
  body = stripLeadingEmptyBlocks(body)

  const heading = `<h1 class="flat-page-title">${escapeHtml(cleanedTitle)}</h1>`
  return body ? `${heading}\n${body}` : heading
}

