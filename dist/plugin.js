exports.version = 0.1
exports.description = "Generate M3U playlists for local media players from file menu"
exports.apiRequired = 12.92 // async fileMenu + plugin middleware behavior used here
exports.repo = "rejetto/hfs-local-player"
exports.frontend_js = 'main.js'

const MEDIA_EXTS = new Set([
    'mp4', 'mkv', 'avi', 'mov', 'webm', 'm4v', 'wmv', 'flv', 'mpeg', 'mpg', 'ts', 'm2ts',
    'mp3', 'm4a', 'aac', 'flac', 'wav', 'ogg', 'opus', 'wma',
])

exports.init = api => {
    const { getNodeName, hasPermission, nodeIsFolder, urlToNode, walkNode } = api.require('./vfs')

    return {
        async middleware(ctx) {
            if (ctx.query.get !== 'm3u')
                return
            return async () => {
                // prefer node already resolved in request state; fallback to upstream path resolution when middleware altered ctx.path
                const node = ctx.state.vfsNode || await urlToNode(ctx.path, ctx)
                // if upstream didn't resolve a file node, keep upstream status/body (eg: 401/403/404) instead of overriding it
                if (!node || !node.source)
                    return

                // derive base URL from the current request so generated playlists match the exact browser/proxy entrypoint in use
                const baseUrl = getCurrentBaseUrl(ctx)
                const lines = ['#EXTM3U']
                const playlistName = getPlaylistName(node)
                if (nodeIsFolder(node))
                    await appendFolderEntries()
                else
                    if (!appendSingleEntry())
                        return fail(ctx, 400, 'only audio/video files support m3u')
                if (lines.length === 1)
                    return fail(ctx, 400, 'no supported media files found')

                ctx.type = 'audio/x-mpegurl'
                // Chrome may render playlists inline when not attached; forcing download is more reliable for local-player handoff.
                ctx.attachment(playlistName + '.m3u')
                ctx.body = lines.join('\n') + '\n'
                ctx.stop()

                function appendSingleEntry() {
                    if (!isSupportedMedia(getExt(getNodeName(node))))
                        return false
                    lines.push(toAbsoluteUrl(baseUrl, ctx.path))
                    return true
                }

                async function appendFolderEntries() {
                    const folderPath = ensureTrailingSlash(ctx.path)
                    const entries = []
                    for await (const child of walkNode(node, { ctx, depth: 0, onlyFiles: true, parallelizeRecursion: false })) {
                        const name = getNodeName(child)
                        if (!isSupportedMedia(getExt(name)))
                            continue
                        // keep can_read enforcement on generated folder playlists so hidden/protected files cannot leak via manual URL calls
                        if (!hasPermission(child, 'can_read', ctx))
                            continue
                        entries.push({
                            name,
                            url: toAbsoluteUrl(baseUrl, folderPath + api.misc.pathEncode(name)),
                        })
                    }
                    // enforce stable ordering because filesystem traversal order can vary across platforms/filesystems
                    entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                    for (const x of entries)
                        lines.push(x.url)
                }
            }
        },
    }

    function toAbsoluteUrl(baseUrl, uri) {
        return baseUrl.replace(/\/$/, '') + uri
    }

    function getCurrentBaseUrl(ctx) {
        const { URL } = ctx
        return URL.protocol + '//' + URL.host + (ctx.state.revProxyPath || '')
    }

    function ensureTrailingSlash(path) {
        return path.endsWith('/') ? path : path + '/'
    }

    function getPlaylistName(node) {
        return getNodeName(node) || 'playlist'
    }

    function getExt(name) {
        const dot = name.lastIndexOf('.')
        return dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''
    }

    function isSupportedMedia(ext) {
        return MEDIA_EXTS.has(ext)
    }

    function fail(ctx, status, body) {
        ctx.status = status
        ctx.body = body
        ctx.stop()
    }
}
