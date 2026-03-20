'use strict';{
    const VIDEO_EXTS = new Set(['mp4', 'mkv', 'avi', 'mov', 'webm', 'm4v', 'wmv', 'flv', 'mpeg', 'mpg', 'ts', 'm2ts'])

    HFS.onEvent('fileMenu', ({ entry }) => {
        return isVideo(entry) && !entry?.cantOpen && {
            id: 'local-player-m3u',
            icon: 'play',
            label: 'Play on your local player',
            href: entry.uri + '?get=m3u',
            target: '_blank',
            rel: 'noopener noreferrer',
            onClick() {
                showFirstUseHint()
            },
        }
    })

    function isVideo(entry) {
        if (!entry || entry.isFolder || entry.web)
            return false
        return VIDEO_EXTS.has(String(entry.ext || '').toLowerCase())
    }

    function showFirstUseHint() {
        if (!canUseLocalStorage())
            return
        const k = 'hfs.localPlayer.firstUseHint'
        if (localStorage.getItem(k))
            return
        localStorage.setItem(k, '1')
        // we show guidance after first click so the same user action still triggers the m3u download without extra steps
        setTimeout(() =>
            HFS.dialogLib.alertDialog("Open the file just downloaded to launch your local player."),
        50)
    }

    function canUseLocalStorage() {
        try { return Boolean(localStorage) }
        catch { return false }
    }
}
