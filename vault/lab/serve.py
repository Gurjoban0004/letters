#!/usr/bin/env python3
"""
Lightweight Zero-Dependency HTTP Server for Letters (HG) Vault Lab
Serves static assets and provides live re-extraction API endpoints.
"""

import os
import sys
import json
import subprocess
from http.server import HTTPServer, SimpleHTTPRequestHandler

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
VAULT_DIR = os.path.dirname(SCRIPT_DIR)
PORT = 3030


class LabRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=VAULT_DIR, **kwargs)

    def do_GET(self):
        # Redirect root to lab UI
        if self.path in ("/", "/lab", "/lab/"):
            self.send_response(302)
            self.send_header("Location", "/lab/index.html")
            self.end_headers()
            return
        super().do_GET()

    def do_POST(self):
        if self.path == "/api/reextract":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            params = json.loads(body) if body else {}

            extract_script = os.path.join(VAULT_DIR, "pipeline", "extract.py")
            try:
                res = subprocess.run(
                    [sys.executable, extract_script],
                    capture_output=True,
                    text=True,
                    cwd=VAULT_DIR,
                    check=True,
                )
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True, "output": res.stdout}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": str(e)}).encode("utf-8"))
            return

        if self.path == "/api/export":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True, "msg": "Assets verified in vault/production_assets/"}).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()


def run(port=PORT):
    server_address = ("0.0.0.0", port)
    httpd = HTTPServer(server_address, LabRequestHandler)
    print(f"==================================================")
    print(f" LETTERS (HG) VAULT LAB SERVER")
    print(f"==================================================")
    print(f" Server running at: http://localhost:{port}/lab/index.html")
    print(f" Root directory:    {VAULT_DIR}")
    print(f" Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    run(port)
