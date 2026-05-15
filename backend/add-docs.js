const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/routes/*.ts');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Quick regex to find router.(get|post|put|delete)('/path', ...)
  // Only if there is no /** @swagger right above it.
  const routeRegex = /router\.(get|post|put|delete)\(\s*'([^']+)'/g;
  
  let newContent = content;
  let match;
  
  // We need to do this carefully so we don't mess up existing comments.
  // Actually, let's just replace the whole file using a simple string replacement.
  
  const lines = content.split('\n');
  const result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/router\.(get|post|put|delete)\(\s*'([^']+)'/);
    if (match) {
      const method = match[1];
      const path = match[2];
      
      // Check if previous line is a comment
      if (i > 0 && lines[i-1].trim() === '*/' && lines[i-2] && lines[i-2].includes('@swagger')) {
        result.push(line);
        continue;
      }
      if (i > 0 && lines[i-1].trim().startsWith('*/')) {
         // might be swagger, skip
      } else {
        // Convert express path parameter /:id to swagger /{id}
        const swaggerPath = path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
        const tag = file.split('/').pop().replace('.routes.ts', '');
        
        result.push(`/**`);
        result.push(` * @swagger`);
        result.push(` * /api/${tag === 'auth' || tag === 'user' || tag === 'search' || tag === 'vector' ? tag : (tag === 'payment' ? 'payment' : tag)}${swaggerPath === '/' ? '' : swaggerPath}:`);
        result.push(` *   ${method}:`);
        result.push(` *     summary: ${method.toUpperCase()} ${path}`);
        result.push(` *     tags: [${tag.charAt(0).toUpperCase() + tag.slice(1)}]`);
        
        // Add parameters if path has {}
        const params = [...swaggerPath.matchAll(/\{([^\}]+)\}/g)].map(m => m[1]);
        if (params.length > 0) {
          result.push(` *     parameters:`);
          params.forEach(p => {
            result.push(` *       - in: path`);
            result.push(` *         name: ${p}`);
            result.push(` *         required: true`);
            result.push(` *         schema:`);
            result.push(` *           type: string`);
          });
        }
        
        result.push(` *     responses:`);
        result.push(` *       200:`);
        result.push(` *         description: Successful response`);
        result.push(` */`);
      }
    }
    result.push(line);
  }
  
  fs.writeFileSync(file, result.join('\n'));
});
console.log('Docs added');
