import request from 'request'
import iconv from 'iconv-lite'

export default app => {
  app.get('/:mot', (req, res) => get_mot(req, res))
}

function get_mot(req, res) {
  request.get({encoding: null, uri:`http://www.jeuxdemots.org/rezo-dump.php?gotermsubmit=Chercher&gotermrel=${req.params.mot}&rel=1`}, (error, response, body) => {
    var utf8String = iconv.decode(new Buffer(body), "ISO-8859-1");
    res.json({status: 'success', data: parse_response(utf8String)})
  })
}

function parse_response(d) {
  let str = d.substring(d.indexOf('<CODE>') + 6, d.indexOf('</CODE>'))
  
  // Get the nodes types
  let nodes_types = parse(str, 'nt')
  // Get the entries
  let entries = parse(str, 'e')
  // Get the relations types
  let relations_types = parse(str, 'rt')
  // Get the outcoming relations
  let outcoming_relations = parse(str, 'r')

  return {nodes_types, entries, relations_types, outcoming_relations}
}


function parse(str, regex) {
  let trash = str.match(new RegExp(`${regex};.+\n`, 'g'))
  let clean = []

  trash.forEach(el => {
    // Clean entries (remove the entries which aren't it, remove the '\n')
    console.log(el)
    if (/\d/.test(el.split(';')[1])) clean.push(el.substring(0, el.length - 1))
  })
  return clean
}