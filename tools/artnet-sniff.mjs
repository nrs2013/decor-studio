// UDP 6454 sniffer — Art-Net到達確認用（アプリと同居可能 / reuseAddr）
// 使い方: node tools/artnet-sniff.mjs [秒数=12]
// 出力: 届いたパケットの送信元IP・種別（ArtDMX/uni番号・ArtPoll・その他UDP）と件数
import { createSocket } from 'node:dgram'

const SECONDS = Number(process.argv[2] ?? 12)
const s = createSocket({ type: 'udp4', reuseAddr: true })
const seen = new Map()
let total = 0
const ID = 'Art-Net\0'

s.on('message', (m, r) => {
  total++
  let info = 'non-artnet len=' + m.length
  if (m.length >= 12 && m.toString('latin1', 0, 8) === ID) {
    const op = m.readUInt16LE(8)
    if (op === 0x5000 && m.length >= 18) {
      const uni = (m.readUInt8(15) << 8) | m.readUInt8(14)
      info = 'ArtDMX uni=' + uni
    } else if (op === 0x2000) {
      info = 'ArtPoll'
    } else {
      info = 'Art-Net op=0x' + op.toString(16)
    }
  }
  const key = r.address + '  ' + info
  const n = (seen.get(key) || 0) + 1
  seen.set(key, n)
  if (n === 1) console.log('HIT: from ' + r.address + '  ' + info)
})
s.on('error', (e) => {
  console.log('listener error:', e.message)
  process.exit(2)
})
s.bind(6454, '0.0.0.0', () => console.log(`listening ${SECONDS}s on UDP 6454 ...`))
setTimeout(() => {
  console.log('total packets:', total)
  for (const [k, v] of seen) console.log('  ' + k + '  x' + v)
  if (total === 0) console.log('=> NOTHING arrived (packets are not reaching this Mac at OS level)')
  process.exit(total > 0 ? 0 : 1)
}, SECONDS * 1000)
