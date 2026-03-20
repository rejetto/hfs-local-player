exports.version = 0.1
exports.description = "Generate M3U playlists for local media players from file menu"
exports.apiRequired = 12.92 // async fileMenu + plugin middleware behavior used here
exports.repo = "rejetto/hfs-local-player"
exports.frontend_js = 'main.js'

const VIDEO_EXTS = new Set(['mp4', 'mkv', 'avi', 'mov', 'webm', 'm4v', 'wmv', 'flv', 'mpeg', 'mpg', 'ts', 'm2ts'])

exports.init = api => {
    const { getNodeName } = api.require('./vfs')

    return {
        async middleware(ctx) {
            if (ctx.query.get !== 'm3u')
                return
            return () => {
                // prefer node already resolved in request state; fallback to upstream path resolution when middleware altered ctx.path
                const node = ctx.state.vfsNode
                // if upstream didn't resolve a file node, keep upstream status/body (eg: 401/403/404) instead of overriding it
                if (!node || !node.source)
                    return

                const videoName = getNodeName(node)
                const dot = videoName.lastIndexOf('.')
                const ext = dot >= 0 ? videoName.slice(dot + 1).toLowerCase() : ''
                if (!VIDEO_EXTS.has(ext))
                    return fail(ctx, 400, 'only video files support m3u')

                // derive base URL from the current request so generated playlists match the exact browser/proxy entrypoint in use
                const baseUrl = getCurrentBaseUrl(ctx)
                const videoUrl = toAbsoluteUrl(baseUrl, ctx.path)
                const lines = ['#EXTM3U']
                lines.push(videoUrl)

                ctx.type = 'audio/x-mpegurl'
                // Chrome may render playlists inline when not attached; forcing download is more reliable for local-player handoff.
                ctx.attachment(videoName + '.m3u')
                ctx.body = lines.join('\n') + '\n'
                ctx.stop()
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

    function fail(ctx, status, body) {
        ctx.status = status
        ctx.body = body
        ctx.stop()
    }
}
