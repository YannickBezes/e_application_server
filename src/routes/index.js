import http from 'http'

export default app => {
  app.get('/:mot', (req, res) => get_mot(req, res))
}

function get_mot(req, res) {
  let data = null
  res.set('charset', 'UTF-8')
  http.get(
    `http://www.jeuxdemots.org/rezo-dump.php?gotermsubmit=Chercher&gotermrel=${req.params.mot}`,
    response => {
      response.on('data', d => {
        data += d
      })
      response.on('end', () => {
        console.log(data)
        res.json({ status: 'success', data: parse_response(data) })
      })
    }
  )
}

function parse_response(d) {
  return d.substring(d.indexOf('<CODE>') + 6, d.indexOf('</CODE>'))
}
