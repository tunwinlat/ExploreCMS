with open('src/components/DynamicPostGrid.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "if (!e.currentTarget.contains(e.relatedTarget)) {" in line:
        new_lines.append("        if (!e.currentTarget.contains(e.relatedTarget as Node)) {\n")
    else:
        new_lines.append(line)

with open('src/components/DynamicPostGrid.tsx', 'w') as f:
    f.writelines(new_lines)
