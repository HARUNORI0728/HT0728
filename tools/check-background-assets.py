#!/usr/bin/env python3
"""Audit conversation backgrounds without writing files. Uses Pillow, like optimize_art.py.

Run with --integrated ID [ID ...] to require specific deliveries in the built game.
Missing planned art and source-only deliveries are reported without failing.
Exit 1 means unreadable art or broken integration. Exit 2 means valid art below spec.
"""

import argparse
from collections import Counter
import hashlib
from pathlib import Path
import re

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / 'assets' / 'backgrounds'
PLAY_DIR = ROOT / 'play'
ID = r'[a-z][a-z0-9_]*'


def script_cues():
    cues = Counter()
    for path in (ROOT / 'design').glob('script-*.md'):
        cues.update(re.findall(rf'^背景：[ \t]*({ID})[ \t]*$', path.read_text(encoding='utf-8'), re.M))
    return cues


def manifest_urls():
    manifest = (ROOT / 'src' / 'art-manifest.ts').read_text(encoding='utf-8')
    block = re.search(r'^export const BG_ART: [^\n]+ = \{\n(.*?)^\};', manifest, re.M | re.S)
    if not block:
        raise ValueError('BG_ART block missing from src/art-manifest.ts')
    urls = {}
    for line in block[1].splitlines():
        entry = re.fullmatch(rf"\s*({ID}): '([^']+)',", line)
        if not entry or entry[1] in urls:
            raise ValueError(f'Invalid or duplicate BG_ART entry: {line.strip()}')
        urls[entry[1]] = entry[2]
    return urls


def dimensions(path, expected_format):
    with Image.open(path) as image:
        if image.format != expected_format:
            raise ValueError(f'{path.name} contains {image.format} data, expected {expected_format}')
        image.load()
        return image.size


def source_description(source):
    if source is None:
        return 'missing', False
    width, height = source
    notes = []
    if width < 1600:
        notes.append('width below 1600 (Q-04 accepted source spec)')
    # Allow rounding the 16:9 height to the nearest whole pixel.
    if abs(width * 9 - height * 16) > 8:
        notes.append('aspect differs from 16:9')
    detail = f'{width}x{height}'
    if notes:
        detail += ' (' + '; '.join(notes) + ')'
    return detail, bool(notes)


def runtime_description(key, url, source, bundle):
    match = re.fullmatch(rf'assets/backgrounds/{re.escape(key)}\.(webp|png)(?:\?v=([a-f0-9]{{8}}))?', url)
    if not match:
        raise ValueError(f'unexpected BG_ART URL: {url}')
    relative_path = url.split('?', 1)[0]
    path = PLAY_DIR / relative_path
    runtime = dimensions(path, match[1].upper())
    if source:
        width = min(source[0], 1280)
        expected = (width, round(source[1] * width / source[0]))
        if runtime != expected:
            raise ValueError(f'{path.name} dimensions {runtime} differ from expected {expected}')
    if match[2] and hashlib.sha1(path.read_bytes()).hexdigest()[:8] != match[2]:
        raise ValueError(f'{path.name} content differs from the manifest cache hash')
    if not re.search(rf"""['"]{re.escape(url)}['"]""", bundle):
        raise ValueError(f'{url} missing from play/index.html')
    return f'{runtime[0]}x{runtime[1]} {match[1]}'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--integrated', metavar='ID', nargs='+', action='extend', default=[])
    parser.add_argument('--planned', metavar='ID', nargs='+', action='extend', default=[],
                        help='include additional IDs that have no script cue yet')
    args = parser.parse_args()
    if any(not re.fullmatch(ID, key) for key in args.integrated + args.planned):
        parser.error('background IDs use lowercase letters, digits and underscores')

    cues = script_cues()
    urls = manifest_urls()
    bundle_path = PLAY_DIR / 'index.html'
    bundle = bundle_path.read_text(encoding='utf-8') if bundle_path.is_file() else ''
    sources = {path.stem: path for path in SOURCE_DIR.glob('*.png')}
    expected = set(cues) | {'title'} | set(args.planned) | set(args.integrated)
    required = set(urls) | set(args.integrated)
    errors = below_spec = 0
    print('ID | cues | source PNG | built game')
    for key in sorted(expected | set(sources) | required):
        source = None
        source_status = 'missing'
        runtime_status = 'not registered'
        try:
            if key in sources:
                source = dimensions(sources[key], 'PNG')
            source_status, misses_spec = source_description(source)
            below_spec += misses_spec
        except (OSError, ValueError) as error:
            errors += 1
            source_status = f'ERROR: {error}'
        try:
            if key in required:
                if key not in sources:
                    raise ValueError('integration has no source PNG')
                if key not in urls:
                    raise ValueError('required BG_ART entry missing')
                runtime_status = runtime_description(key, urls[key], source, bundle)
        except (OSError, ValueError) as error:
            errors += 1
            runtime_status = f'ERROR: {error}'
        print(f'{key} | {cues[key]} | {source_status} | {runtime_status}')

    missing = expected - set(sources)
    waiting = set(sources) - set(urls)
    print(f'{len(missing)} expected sources missing; {len(waiting)} sources not registered; '
          f'{below_spec} sources outside spec; {errors} validation errors.')
    return 1 if errors else 2 if below_spec else 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (OSError, ValueError) as error:
        raise SystemExit(f'ERROR: {error}')
