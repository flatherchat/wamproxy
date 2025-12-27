export default {
  async fetch(request, env, ctx) {
    // 1. Only accept GET requests
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { 
        status: 405,
        headers: { 'Allow': 'GET' }
      });
    }

    const url = new URL(request.url);
    const encodedTarget = url.searchParams.get('url');

    // 2. Validate required parameter
    if (!encodedTarget) {
      return new Response('Missing "url" parameter (must be base64 encoded)', { 
        status: 400 
      });
    }

    try {
      // 3. Decode the base64 URL
      const decodedUrl = atob(encodedTarget);
      
      // 4. Validate URL format
      let targetUrl;
      try {
        targetUrl = new URL(decodedUrl);
        
        // Basic security: Block certain protocols
        if (!['http:', 'https:'].includes(targetUrl.protocol)) {
          return new Response('Invalid protocol. Only HTTP/HTTPS are allowed.', { 
            status: 400 
          });
        }
      } catch (e) {
        return new Response('Invalid URL format', { 
          status: 400 
        });
      }

      // 5. Fetch from target with browser-like headers
      const response = await fetch(targetUrl.toString(), {
        headers: {
          // Modern Chrome User-Agent
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          
          // Common referer to appear organic
          'Referer': 'https://www.google.com/',
          
          // Standard browser accept headers
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          
          // Browser behavior headers
          'Cache-Control': 'max-age=0',
          'Upgrade-Insecure-Requests': '1',
          
          // Fetch metadata headers (modern browsers send these)
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'cross-site',
          'Sec-Fetch-User': '?1',
          
          // Connection headers
          'Connection': 'keep-alive',
          
          // Optional: Forward original IP (be careful with privacy)
          // 'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || ''
        }
      });

      // 6. Check if fetch was successful
      if (!response.ok) {
        return new Response(`Upstream error: ${response.status} ${response.statusText}`, {
          status: response.status
        });
      }

      // 7. Prepare response headers
      const headers = new Headers(response.headers);
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      
      // Extract filename from URL or generate one
      const pathParts = targetUrl.pathname.split('/');
      let filename = pathParts[pathParts.length - 1] || 'download';
      
      // Ensure filename has extension if content-type suggests one
      if (contentType.startsWith('text/html') && !filename.includes('.')) {
        filename += '.html';
      } else if (contentType.startsWith('image/') && !filename.includes('.')) {
        const ext = contentType.split('/')[1];
        filename += `.${ext}`;
      }
      
      // Clean filename for Content-Disposition
      filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      
      // 8. FORCE DOWNLOAD: Set Content-Disposition to attachment
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Preserve original content type
      headers.set('Content-Type', contentType);
      
      // 9. Return the proxied response
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });

    } catch (error) {
      console.error('Proxy Error:', error);
      
      // 10. Handle specific errors
      if (error.message.includes('fetch failed')) {
        return new Response('Failed to connect to target server', { 
          status: 502 
        });
      }
      
      return new Response('Internal Server Error', { 
        status: 500 
      });
    }
  }
};
