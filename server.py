import http.server
import socketserver
import requests
import urllib.parse
from http import HTTPStatus

PORT = 8000

class ProxyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Check if this is a proxy request
        if self.path.startswith('/proxy'):
            self.handle_proxy()
        else:
            # Serve static files as usual
            super().do_GET()

    def handle_proxy(self):
        # Parse the URL parameter
        query = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(query)
        target_url = params.get('url', [None])[0]

        if not target_url:
            self.send_error(HTTPStatus.BAD_REQUEST, "Missing 'url' parameter")
            return

        try:
            # Fetch the image from the target URL
            # We pretend to be a browser to avoid some blocking
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
                'Referer': 'https://music-in.tistory.com/'
            }
            response = requests.get(target_url, headers=headers, stream=True)
            
            # Send the response back to the client
            self.send_response(response.status_code)
            
            # Copy relevant headers
            for key, value in response.headers.items():
                if key.lower() in ['content-type', 'content-length', 'cache-control', 'last-modified']:
                    self.send_header(key, value)
            
            # Add CORS headers to allow our frontend to access it
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            # Stream the content
            for chunk in response.iter_content(chunk_size=8192):
                self.wfile.write(chunk)

        except Exception as e:
            self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR, str(e))

print(f"Serving at http://localhost:{PORT}")
print("Press Ctrl+C to stop.")

with socketserver.TCPServer(("", PORT), ProxyHTTPRequestHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
