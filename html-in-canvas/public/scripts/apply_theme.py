# Copyright 2026 Google LLC
# SPDX-License-Identifier: Apache-2.0

import os
import glob
import re

html_files = glob.glob('*.html')

for file in html_files:
    if 'text-input.html .html' == file:
        continue # skip weird broken file
    
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Inject links if not present
    links = '<link rel="stylesheet" href="css/theme.css">\n    <script type="module" src="js/material-web-bundle.js"></script>\n'
    if 'css/theme.css' not in content:
        # Try to inject after <title>
        if '<title>' in content:
            content = re.sub(r'(</title>)', r'\1\n    ' + links, content)
        elif '<style>' in content:
            # Inject before the first <style>
            content = content.replace('<style>', links + '<style>', 1)
        elif '<meta ' in content:
            # Inject after first meta
            content = re.sub(r'(<meta [^>]*>)', r'\1\n' + links, content, count=1)
        else:
            # inject after first line
            lines = content.split('\n')
            content = '\n'.join([lines[0]] + [links.strip()] + lines[1:])

    # 2. Strip bad colors from body
    # Using regex to remove background, color, font-family from body selector
    def prune_body(match):
        body_css = match.group(0)
        body_css = re.sub(r'background(?:-color)?:\s*[^;]+;', '', body_css)
        body_css = re.sub(r'color:\s*[^;]+;', '', body_css)
        body_css = re.sub(r'font-family:\s*[^;]+;', '', body_css)
        return body_css

    content = re.sub(r'body\s*{[^}]+}', prune_body, content)

    # 3. Strip aggressive colors from panels/buttons
    def prune_aggressions(match):
        css = match.group(0)
        css = re.sub(r'background(?:-color)?:\s*[^;]+;', '', css)
        css = re.sub(r'color:\s*[^;]+;', '', css)
        css = re.sub(r'border(?:-color)?:\s*[^;]+;', '', css)
        css = re.sub(r'box-shadow:\s*[^;]+;', '', css)
        css = re.sub(r'text-shadow:\s*[^;]+;', '', css)
        return css

    aggressive_selectors = [
        r'\.ui-panel\s*{[^}]+}',
        r'\.bubbly-card\s*{[^}]+}',
        r'\.btn-primary\s*{[^}]+}',
        r'\.btn-primary:hover\s*{[^}]+}',
        r'\.btn-primary:active\s*{[^}]+}',
        r'\.btn-secondary\s*{[^}]+}',
        r'\.btn-secondary:hover\s*{[^}]+}',
        r'\.btn-secondary:active\s*{[^}]+}',
        r'\.title\s*{[^}]+}',
        r'\.stat-box\s*{[^}]+}',
        r'h1\s*{[^}]+}'
    ]

    for sel in aggressive_selectors:
        content = re.sub(sel, prune_aggressions, content)

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Processed {len(html_files)} files.")
