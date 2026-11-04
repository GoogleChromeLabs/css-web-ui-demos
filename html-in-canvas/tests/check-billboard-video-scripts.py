"""Fail if billboard-video.html loads a local script that does not exist."""

import os
import re
import sys

DEMO = os.path.join(os.path.dirname(__file__), '..', 'public', 'demos', 'billboard-video.html')

with open(DEMO, encoding='utf-8') as f:
    html = f.read()

missing = []
for src in re.findall(r'<script[^>]*\ssrc="([^"]+)"', html):
    if src.startswith(('http:', 'https:', '//')):
        continue
    path = os.path.normpath(os.path.join(os.path.dirname(DEMO), src))
    if not os.path.exists(path):
        missing.append(src)

for src in missing:
    print(f'missing local script: {src}')

if missing:
    sys.exit(1)

print('all local scripts exist')
