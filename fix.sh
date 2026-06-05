#!/bin/bash
routes=(
"admin/dashboard/components"
"admin/dashboard/edit/[id]"
"admin/dashboard/integrations"
"admin/dashboard/navigation"
"admin/dashboard/new"
"admin/dashboard/photos/[albumId]"
"admin/dashboard/photos/new-album"
"admin/dashboard/photos"
"admin/dashboard/popup"
"admin/dashboard/posts/drafts"
"admin/dashboard/posts/published"
"admin/dashboard/profile"
"admin/dashboard/projects/edit/[id]"
"admin/dashboard/projects/github"
"admin/dashboard/projects/new"
"admin/dashboard/projects"
"admin/dashboard/settings"
"admin/dashboard/tags"
"admin/dashboard/users"
"admin/dashboard"
"admin/reset-password"
"api/craft/folders"
"api/craft/sync"
"api/craft/test"
"api/featured"
"api/posts"
"api/related"
"api/search"
"api/test-bunny-storage"
"api/trending"
"api/upload"
"api/verify-email"
"api/views"
"photos/[albumSlug]"
"post/[slug]"
"projects/[slug]"
)

for route in "${routes[@]}"; do
    file_path="src/app/${route}/page.tsx"
    if [ ! -f "$file_path" ]; then
        file_path="src/app/${route}/route.ts"
    fi
    if [ ! -f "$file_path" ]; then
        file_path="src/app/${route}/layout.tsx"
    fi

    if [ -f "$file_path" ]; then
        if grep -q "export const runtime" "$file_path"; then
            echo "Skipping $file_path - already has runtime"
            continue
        fi

        if grep -q "'use client'" "$file_path"; then
            sed -i "s/'use client'/'use client'\n\nexport const runtime = 'edge';/g" "$file_path"
        elif grep -q "\"use client\"" "$file_path"; then
            sed -i "s/\"use client\"/\"use client\"\n\nexport const runtime = 'edge';/g" "$file_path"
        else
            echo "export const runtime = 'edge';" | cat - "$file_path" > temp && mv temp "$file_path"
        fi
        echo "Added edge runtime to $file_path"
    else
        echo "Could not find file for route: $route"
    fi
done
