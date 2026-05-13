import TurndownService from 'turndown';

/**
 * Transforms Confluence Storage XML to Markdown.
 */
export function transformToMarkdown(storageXml: string): string {
  if (!storageXml) {
    return '';
  }

  // 1. Pre-processing
  let processed = storageXml;

  // Replace macros: <ac:structured-macro ac:name="name">...</ac:structured-macro> -> [Confluence Macro: name]
  processed = processed.replace(
    /<ac:structured-macro ac:name="([^"]+)"[^>]*>[\s\S]*?<\/ac:structured-macro>/g,
    '[Confluence Macro: $1]'
  );

  // Strip <ac:rich-text-body> tags but keep content
  processed = processed.replace(/<\/?ac:rich-text-body[^>]*>/g, '');

  // Replace attachments: <ri:attachment ri:filename="name" /> -> [Attachment: name]
  processed = processed.replace(
    /<ri:attachment ri:filename="([^"]+)"\s*\/>/g,
    '[Attachment: $1]'
  );

  // Replace page links: <ri:page ri:content-title="title" /> -> [ConfluencePage:(title)]
  processed = processed.replace(
    /<ri:page ri:content-title="([^"]+)"\s*\/>/g,
    '[ConfluencePage:($1)]'
  );

  // 2. Turndown conversion
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  let markdown = turndownService.turndown(processed);

  // 3. Post-processing
  // Replace \[ConfluencePage:(title)\] placeholders -> [title](title)
  // Note: Turndown escapes square brackets, so we match the escaped versions
  markdown = markdown.replace(/\\\[ConfluencePage:\(([^)]+)\)\\\]/g, '[$1]($1)');

  // Unescape other markers
  markdown = markdown.replace(/\\\[Confluence Macro: /g, '[Confluence Macro: ');
  markdown = markdown.replace(/\\\[Attachment: /g, '[Attachment: ');
  markdown = markdown.replace(/\\\]/g, ']');

  // Collapse 3+ consecutive newlines to 2
  markdown = markdown.replace(/\n{3,}/g, '\n\n');

  // Trim leading/trailing whitespace
  return markdown.trim();
}
