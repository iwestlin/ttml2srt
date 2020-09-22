// https://raw.githubusercontent.com/seiya-npm/ttml2srt/master/main.js
const entities = require("entities")

function ttml2srt(data,forceFps) {
    // get framerate
    const FPSnumMatch = data.match(/ttp:frameRate="(\d+)"/);
    const FPSmulMatch = data.match(/ttp:frameRateMultiplier="(\d+) (\d+)"/);
    const FPSnum      = FPSnumMatch ? parseInt(FPSnumMatch[1]) : 0; // numerator
    const FPSmul      = FPSmulMatch ? parseInt(FPSmulMatch[1]) : 1; // multiplier
    const FPSden      = FPSmulMatch ? parseInt(FPSmulMatch[2]) : 1; // denominator
    let frameRate     = FPSnum * FPSmul / FPSden;
    frameRate         = forceFps ? forceFps : frameRate;
    if((frameRate ^ 0) !== frameRate){
        frameRate = frameRate.toFixed(3);
    }
    const FPSsfrMatch = data.match(/ttp:frameRate="ttp:subFrameRate="(\d+)"/);
    const subFrameRate = FPSsfrMatch ? parseInt(FPSsfrMatch[1]) : 1;
    const tickRateMatch = data.match(/ttp:tickRate="(\d+)"/);
    const tickRate = tickRateMatch ? parseInt(tickRateMatch[1]) : 1;
    console.info(`[INFO] FRAMERATE IS ${frameRate>0?frameRate:'UNKNOWN\n[WARN] TIMING MAY BE INCORRECT'}`);
    // pre build srt
    let outSrt = '', str_id = 0;
    let ptime  = '', сtime  = '';
    // build srt
    const ttmlStr  = '<p(.*?)>(.*?)</p>';
    const arr = data.match(new RegExp('<p (.*?)>(.*?)</p>','g'))
    for (let i = 0; i < arr.length; i++) {
        let x = arr[i]
        const next_begin = get_begin_value(arr[i + 1])
        let m = x.match(new RegExp(ttmlStr));
        if (m && m.length == 3) {
            let atts = m[1].trim().match(/[^\s]*="?[^"]*/g)
                .map(x=>x.split('='))
                .reduce((r,x)=>(r[x[0]]=x[1].replace(/^"/g,''),r),{});
            // console.log('atts:', atts)
            if(!atts.begin || !atts.end){
                console.warn('[WARN] Some string was not parsed, start/end time attribute was missing!');
            }
            let begin = formatSrtTime(atts.begin, frameRate, subFrameRate, tickRate);
            let end = formatSrtTime(get_earlier_time(atts.end, next_begin), frameRate, subFrameRate, tickRate);
            let text = m[2]
                .replace(/<\/br>/g, '')
                .replace(/&apos;/g, '\'')
                .replace(/&quot;/g, '"')
                .replace(/<(\S*?) (.*?)>(.*?)<\/.*?>/g, fontRepl)
                .replace(/<span>(.*?)<\/span>/g, '$1')
                .replace(/(<br.*?>)+/g, '\r\n')
                .replace(/<[^>]*\/>/g,'');
            text = entities.decodeHTML(text)
            if(text.trim() !== ''){
                сtime = `${begin} --> ${end}`;
                if(ptime != сtime){
                    ptime = сtime;
                    str_id++;
                    if(outSrt != ''){
                        outSrt += `\r\n\r\n`;
                    }
                    outSrt += `${str_id}\r\n${сtime}\r\n`;
                }
                else{
                    outSrt += `\r\n`;
                }
                outSrt += `${text}`;
            }
        }
        else{
            console.warn('[WARN] Some string was not parsed');
        }
    }
    outSrt += `\r\n\r\n`;
    const startTagMatch = /([^\s])<(\w)/g;
    if(outSrt.match(startTagMatch)){
        outSrt = outSrt.replace(startTagMatch,'$1 <$2');
    }
    const endTagMatch = /<\/(\w+)>([^\s])/g;
    if(outSrt.match(endTagMatch)){
        outSrt = outSrt.replace(endTagMatch,'</$1> $2');
    }
    return `\uFEFF${outSrt}`;
}
function formatSrtTime(time, frameRate, subFrameRate, tickRate) {
    let t = time.match(/(\d*:\d*:\d*)(.*)$/);
    if (!t) {
        t = time.match(/([0-9.]*)(.*)/);
        const mult = {
            'h' : 3600,           // hours
            'm' : 60,             // minutes
            's' : 1,              // seconds
            'ms': 0.001,          // milliseconds
            'f' : 1 / frameRate,  // frames
            't' : 1 / tickRate,   // ticks
        };
        let seconds = parseFloat(t[1]) * mult[t[2]];
        let h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        let m = Math.floor(seconds % 3600 / 60).toString().padStart(2, '0');
        let s = Math.floor(seconds % 60).toString().padStart(2, '0');
        let ms = Math.round((seconds - Math.floor(seconds)) * 1000).toString().padEnd(3, '0').substr(0, 3);
        return `${h}:${m}:${s},${ms}`;
    }
    let f = t[2];
    if (f.length == 0) {
        return `${t[1]},000`;
    }
    if (f[0] === '.') {
        let ms = f.substr(1).padEnd(3, '0').substr(0, 3);
        return `${t[1]},${ms}`;
    }
    if (f[0] === ':') {
        let fa = f.substr(1).split('.');
        let frames = parseInt(fa[0]);
        if (fa.length > 1) {
            frames += parseInt(fa[1]) / subFrameRate;
        }
        let ms = Math.floor(frames * 1000 / frameRate).toString();
        return t[1] + ',' + ms.padStart(3, '0');
    }
    // invalid time
    return `${t[1]},000`;
}
function fontRepl(str, tag, attrs, txt) {
    if (tag != 'span') {
        return txt;
    }
    let at = attrs.replace(/\s*=\s*/g,'=').split(' ').filter(x => x.trim());
    for (let a of at) {
        let ax = a.match(/tts:color="(.*?)"/);
        if (ax) {
            txt = `<font color="${ax[1]}">${txt.trim()}</font>`;
            continue;
        }
        switch (a) {
            case 'tts:fontStyle="italic"':
                txt = `<i>${txt.trim()}</i>`;
                break;
            case 'tts:textDecoration="underline"':
                txt = `<u>${txt.trim()}</u>`;
                break;
            case 'tts:fontWeight="bold"':
                txt = `<b>${txt.trim()}</b>`;
                break;
        }
    }
    return txt;
}

function get_begin_value (s) {
  if (!s) return
  const m = s.match(/begin="(.+?)"/)
  return m && m[1]
  // let begin = m && m[1]
  // if (!begin) return Infinity
  // return Number(begin.replace(/:/g, ''))
}

function get_earlier_time (a, b) {
  if (b < a) return b
  return a
}

module.exports = ttml2srt
