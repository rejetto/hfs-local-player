# hfs-local-player

Adds a file-menu action for video files: `Play on your local player`.

The action downloads a generated `.m3u` playlist containing:
- the selected video URL
- all readable subtitle sidecar files matching `basename*.srt` in the same folder

The playlist format uses `#EXTVLCOPT:sub-file=...` lines so players like VLC can load subtitles.
