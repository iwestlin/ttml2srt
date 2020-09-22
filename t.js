const ttml2srt = require('./ttml2srt')

s = fs.readFileSync('./c.ttml', 'utf-8')
fs.writeFileSync('./c.srt', ttml2srt(s))
