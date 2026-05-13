import { transformToMarkdown } from '../utils/confluence.transformer';

describe('ConfluenceTransformer', () => {
  it('should transform simple HTML to Markdown (happy path)', () => {
    const xml = '<h1>Title</h1><p>This is a <strong>paragraph</strong>.</p><table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>';
    const markdown = transformToMarkdown(xml);
    
    expect(markdown).toContain('# Title');
    expect(markdown).toContain('This is a **paragraph**.');
    expect(markdown).toContain('Cell 1');
    expect(markdown).toContain('Cell 2');
  });

  it('should strip macros and replace with placeholder', () => {
    const xml = '<ac:structured-macro ac:name="code"><ac:plain-text-body><![CDATA[console.log("hello");]]></ac:plain-text-body></ac:structured-macro>';
    const markdown = transformToMarkdown(xml);
    
    expect(markdown).toBe('[Confluence Macro: code]');
  });

  it('should preserve content within rich-text-body tags', () => {
    const xml = '<ac:rich-text-body><p>Inner content</p></ac:rich-text-body>';
    const markdown = transformToMarkdown(xml);
    
    expect(markdown).toBe('Inner content');
  });

  it('should replace attachments with placeholder', () => {
    const xml = '<ri:attachment ri:filename="diagram.png" />';
    const markdown = transformToMarkdown(xml);
    
    expect(markdown).toBe('[Attachment: diagram.png]');
  });

  it('should replace page links with temporary markdown links', () => {
    const xml = '<ri:page ri:content-title="Project Plan" />';
    const markdown = transformToMarkdown(xml);
    
    expect(markdown).toBe('[Project Plan](Project Plan)');
  });

  it('should collapse 3+ consecutive newlines', () => {
    const xml = '<p>Line 1</p><br/><br/><br/><br/><p>Line 2</p>';
    const markdown = transformToMarkdown(xml);
    
    // Turndown might handle <br/> differently, but we want to ensure no more than 2 newlines
    expect(markdown).not.toMatch(/\n{3,}/);
    expect(markdown).toContain('Line 1');
    expect(markdown).toContain('Line 2');
  });

  it('should handle empty string input', () => {
    expect(transformToMarkdown('')).toBe('');
    // @ts-ignore
    expect(transformToMarkdown(null)).toBe('');
  });

  it('should handle complex mixed content', () => {
    const xml = `
      <h1>Main Page</h1>
      <ac:structured-macro ac:name="info">
        <ac:rich-text-body><p>Important info here</p></ac:rich-text-body>
      </ac:structured-macro>
      <p>Check the <ri:attachment ri:filename="notes.txt" /> and the <ri:page ri:content-title="Other Page" />.</p>
    `;
    const markdown = transformToMarkdown(xml);
    
    expect(markdown).toContain('# Main Page');
    expect(markdown).toContain('[Confluence Macro: info]');
    expect(markdown).toContain('[Attachment: notes.txt]');
    expect(markdown).toContain('[Other Page](Other Page)');
  });
});
