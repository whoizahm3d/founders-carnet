import re, sys

files = [
    'frontend/src/app/layout.tsx',
    'frontend/src/components/layout/LegalPageNav.tsx',
    'frontend/src/components/layout/PublicNav.tsx',
    'frontend/src/components/layout/PublicFooter.tsx',
    'frontend/src/app/privacy/page.tsx',
    'frontend/src/app/terms/page.tsx',
]

banned_words = [
    'delve', 'leverage', 'robust', 'harness', 'showcase', 'navigate', 'vibrant',
    'framework', 'unlock', 'revolutionize', 'game-changer', 'seamless',
    'bespoke', 'tailored', 'pivotal', 'paramount', 'foster', 'empower',
    'elevate', 'cutting-edge', 'state-of-the-art', 'utilize', 'facilitate'
]

dashes = ['\u2014', '\u2013']
hex_pattern = re.compile(r'#[0-9a-fA-F]{3,8}')
arbitrary_pattern = re.compile(r'\b[a-z]+-\[[^\]]+\]')

has_error = False

for path in files:
    content = open(path, encoding='utf-8').read()
    
    # Check dashes
    for d in dashes:
        if d in content:
            print(f'ERROR: Dash found in {path}: U+{ord(d):04X}')
            has_error = True
            
    # Check banned words (case insensitive, whole word)
    for w in banned_words:
        matches = re.findall(r'\b' + re.escape(w) + r'\b', content, re.IGNORECASE)
        if matches:
            print(f'ERROR: Banned word "{w}" found in {path}: {matches}')
            has_error = True

    # Check raw hex in components
    hexes = hex_pattern.findall(content)
    if hexes:
        print(f'ERROR: Raw hex found in {path}: {hexes}')
        has_error = True

    # Check arbitrary brackets
    arbs = arbitrary_pattern.findall(content)
    if arbs:
        print(f'ERROR: Arbitrary Tailwind bracket found in {path}: {arbs}')
        has_error = True

if not has_error:
    print('SWEEP PASSED: 0 dashes, 0 banned words, 0 raw hex, 0 arbitrary brackets across all files!')
