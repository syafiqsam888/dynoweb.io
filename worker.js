/**
 * Cloudflare Worker for Bulk URL Proxy Generator
 * Provides an interface to convert multiple URLs to proxy URLs
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(request) {
  const url = new URL(request.url)
  
  if (url.pathname === '/') {
    return handleHomePage()
  }
  
  if (url.pathname === '/api/proxy' && request.method === 'POST') {
    return handleProxyGeneration(request)
  }
  
  return new Response('Not Found', { status: 404 })
}

/**
 * Handle proxy URL generation
 * @param {Request} request
 */
async function handleProxyGeneration(request) {
  try {
    const data = await request.json()
    const urls = data.urls || []
    
    const proxyUrls = urls.map(url => {
      // Generate proxy URL by prefixing with worker domain
      const encodedUrl = encodeURIComponent(url)
      return `${request.url.split('/api/proxy')[0]}/proxy/${encodedUrl}`
    })
    
    return new Response(JSON.stringify({
      success: true,
      originalUrls: urls,
      proxyUrls: proxyUrls
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}

/**
 * Generate the home page with bulk URL proxy generator interface
 * @returns {Response}
 */
function handleHomePage() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bulk URL Proxy Generator - DynoWeb.io</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .main-content {
            padding: 40px;
        }
        
        .input-section {
            margin-bottom: 30px;
        }
        
        .input-section label {
            display: block;
            font-weight: 600;
            margin-bottom: 10px;
            color: #333;
            font-size: 1.1em;
        }
        
        #urlInput {
            width: 100%;
            min-height: 200px;
            padding: 15px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 14px;
            font-family: 'Courier New', monospace;
            resize: vertical;
            transition: border-color 0.3s ease;
        }
        
        #urlInput:focus {
            outline: none;
            border-color: #4facfe;
            box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.1);
        }
        
        .button-section {
            text-align: center;
            margin: 30px 0;
        }
        
        #generateBtn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 40px;
            font-size: 1.1em;
            font-weight: 600;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        
        #generateBtn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }
        
        #generateBtn:active {
            transform: translateY(0);
        }
        
        #generateBtn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .output-section {
            margin-top: 30px;
        }
        
        #output {
            width: 100%;
            min-height: 200px;
            padding: 15px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 14px;
            font-family: 'Courier New', monospace;
            background: #f8f9fa;
            resize: vertical;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            color: white;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 0.9em;
            opacity: 0.9;
        }
        
        .loading {
            display: none;
            text-align: center;
            margin: 20px 0;
        }
        
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #4facfe;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .instructions {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 20px;
            margin-bottom: 30px;
            border-radius: 0 8px 8px 0;
        }
        
        .instructions h3 {
            color: #1976d2;
            margin-bottom: 10px;
        }
        
        .instructions ul {
            color: #424242;
            padding-left: 20px;
        }
        
        .instructions li {
            margin-bottom: 5px;
        }
        
        @media (max-width: 768px) {
            .header h1 {
                font-size: 2em;
            }
            
            .main-content {
                padding: 20px;
            }
            
            .stats {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔗 Bulk URL Proxy Generator</h1>
            <p>Convert multiple URLs to proxy URLs instantly</p>
        </div>
        
        <div class="main-content">
            <div class="instructions">
                <h3>📋 How to Use:</h3>
                <ul>
                    <li>Paste your URLs in the input area (one per line)</li>
                    <li>Click "Generate Proxy URLs" to process them</li>
                    <li>Copy the generated proxy URLs from the output area</li>
                    <li>Use the proxy URLs to access content through this worker</li>
                </ul>
            </div>
            
            <div class="input-section">
                <label for="urlInput">📥 Input URLs (one per line):</label>
                <textarea 
                    id="urlInput" 
                    placeholder="https://example.com/file1.mp4&#10;https://another-site.com/video.avi&#10;https://domain.org/document.pdf"
                ></textarea>
            </div>
            
            <div class="button-section">
                <button id="generateBtn" onclick="generateProxyUrls()">
                    🚀 Generate Proxy URLs
                </button>
            </div>
            
            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p>Processing URLs...</p>
            </div>
            
            <div class="stats" id="stats" style="display: none;">
                <div class="stat-card">
                    <div class="stat-number" id="totalUrls">0</div>
                    <div class="stat-label">Total URLs</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);">
                    <div class="stat-number" id="processedUrls">0</div>
                    <div class="stat-label">Processed</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);">
                    <div class="stat-number" id="processingTime">0</div>
                    <div class="stat-label">Time (ms)</div>
                </div>
            </div>
            
            <div class="output-section" id="outputSection" style="display: none;">
                <label for="output">📤 Generated Proxy URLs:</label>
                <textarea 
                    id="output" 
                    readonly 
                    placeholder="Generated proxy URLs will appear here..."
                ></textarea>
            </div>
        </div>
    </div>

    <script>
        let processingStartTime;
        
        function validateUrl(url) {
            try {
                const urlObj = new URL(url.trim());
                return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
            } catch (error) {
                return false;
            }
        }
        
        function extractUrls(text) {
            return text
                .split('\\\\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .filter(validateUrl);
        }
        
        function updateStats(totalUrls, processedUrls, processingTime) {
            document.getElementById('totalUrls').textContent = totalUrls;
            document.getElementById('processedUrls').textContent = processedUrls;
            document.getElementById('processingTime').textContent = processingTime;
            document.getElementById('stats').style.display = 'grid';
        }
        
        function showLoading(show) {
            document.getElementById('loading').style.display = show ? 'block' : 'none';
            document.getElementById('generateBtn').disabled = show;
        }
        
        function showOutput(show) {
            document.getElementById('outputSection').style.display = show ? 'block' : 'none';
        }
        
        async function generateProxyUrls() {
            const inputText = document.getElementById('urlInput').value;
            
            if (!inputText.trim()) {
                alert('⚠️ Please enter some URLs to process');
                return;
            }
            
            const urls = extractUrls(inputText);
            
            if (urls.length === 0) {
                alert('⚠️ No valid URLs found. Please check your input.');
                return;
            }
            
            processingStartTime = Date.now();
            showLoading(true);
            showOutput(false);
            
            try {
                const response = await fetch('/api/proxy', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ urls })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const proxyUrls = data.proxyUrls.join('\\\\n');
                    document.getElementById('output').value = proxyUrls;
                    
                    const processingTime = Date.now() - processingStartTime;
                    updateStats(urls.length, data.proxyUrls.length, processingTime);
                    showOutput(true);
                } else {
                    throw new Error(data.error || 'Unknown error occurred');
                }
            } catch (error) {
                console.error('Error generating proxy URLs:', error);
                alert('❌ Error: ' + error.message);
            } finally {
                showLoading(false);
            }
        }
        
        // Allow Enter key to trigger generation when in textarea
        document.getElementById('urlInput').addEventListener('keydown', function(event) {
            if (event.ctrlKey && event.key === 'Enter') {
                event.preventDefault();
                generateProxyUrls();
            }
        });
        
        // Auto-resize textarea based on content
        document.getElementById('urlInput').addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.max(200, this.scrollHeight) + 'px';
        });
        
        // Copy to clipboard functionality
        document.getElementById('output').addEventListener('click', function() {
            if (this.value) {
                this.select();
                document.execCommand('copy');
                
                // Show temporary feedback
                const originalPlaceholder = this.placeholder;
                this.placeholder = '✅ Copied to clipboard!';
                setTimeout(() => {
                    this.placeholder = originalPlaceholder;
                }, 2000);
            }
        });
        
        // Initialize page
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 Bulk URL Proxy Generator loaded successfully');
            document.getElementById('urlInput').focus();
        });
    </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=86400'
    }
  })
}