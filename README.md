# hfs-local-player

Adds a file-menu action for:
- audio/video files
- folders (builds a playlist from supported files in that folder)

The action downloads a generated `.m3u` playlist containing only the selected media URL.
For folders, the playlist contains supported media files from the folder only (no recursion).
Subtitle sidecar files are not included.
