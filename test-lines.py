with open('FRONTEND/script.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(975, 990):
    if i < len(lines):
        print(f"{i+1}: {lines[i].rstrip()}")
