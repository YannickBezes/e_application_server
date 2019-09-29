import request from 'request'
import iconv from 'iconv-lite'
import fs from 'fs'

export default app => {
  app.get('/:word', (req, res) => get_word(req, res))
  app.get('/:word/:rel', (req, res) => get_word(req, res))
}

function get_word(req, res) {
  try {
    if (fs.existsSync(`cache/${req.params.word}.json`)) {
      fs.readFile(`cache/${req.params.word}.json`, 'utf8', (err, data) => {
        res.send({ status: 'success', data: JSON.parse(data) })
      })
    } else {
      request.get({ encoding: null, uri: `http://www.jeuxdemots.org/rezo-dump.php?gotermsubmit=Chercher&gotermrel=${req.params.word}&rel=${req.params.rel}` }, (error, response, body) => {
        if (response.statusCode == 200) {
          // Convert ISO to utf8
          let utf8_string = iconv.decode(new Buffer(body), "ISO-8859-1");
          let data = parse_response(utf8_string)
          save_cache(req.params.word, data)
          if (data)
            res.json({ status: 'success', data })
          else
            res.json({ status: 'failed', data: null, message: 'Not found' })
        } else
          res.json({ status: 'failed', data: null, message: 'Not found' })
      })
    }
  } catch (err) {
    console.error(err)
  }
}

function parse_response(d) {
  let str = d.substring(d.indexOf('<CODE>') + 6, d.indexOf('</CODE>'))
  if (str.trim() != '') {
    // Get the nodes types
    let nodes_types = parse(str, 'nodes_types')
    // Get the entries
    let entries = parse(str, 'entries')
    // Get the relations types
    let relations_types = parse(str, 'relation_types')
    // Get the outcoming relations
    let outcoming_relations = parse(str, 'outcomming_relations')
    // Get the incomming relations
    let incomming_relations = parse(str, 'incomming_relations')

    return { nodes_types, entries, relations_types, outcoming_relations, incomming_relations }
  }
  return null
}

function parse(str, type) {
  let start, end, regex;
  switch (type) {
    case "nodes_types":
      start = "// les types de noeuds (Nodes Types) : nt;ntid;'ntname'"
      end = "// les noeuds/termes (Entries) : e;eid;'name';type;w;'formated name'"
      regex = "nt"
      break

    case "entries":
      start = "// les noeuds/termes (Entries) : e;eid;'name';type;w;'formated name'"
      end = "// les types de relations (Relation Types) : rt;rtid;'trname';'trgpname';'rthelp'"
      regex = "e"
      break

    case "relation_types":
      start = "// les types de relations (Relation Types) : rt;rtid;'trname';'trgpname';'rthelp'"
      end = "// les relations sortantes : r;rid;node1;node2;type;w"
      regex = "rt"
      break

    case "outcomming_relations":
      start = "// les relations sortantes : r;rid;node1;node2;type;w"
      end = "// les relations entrantes : r;rid;node1;node2;type;w "
      regex = "r"
      break

    case "incomming_relations":
      start = "// les relations entrantes : r;rid;node1;node2;type;w "
      end = "// END"
      regex = "r"
      break
  }

  let trash = str.substring(str.indexOf(start) + start.length, str.indexOf(end));
  trash = str.match(new RegExp(`${regex};.+\n`, 'g'))
  let clean = []
  if (trash) {
    trash.forEach(el => {
      // Clean entries (remove the entries which aren't it, remove the '\n')
      if (/\d/.test(el.split(';')[1])) clean.push(el.substring(0, el.length - 1))
    })
  }
  return clean
}

function save_cache(word, data) {
  fs.writeFile(`cache/${word}.json`, JSON.stringify(data), function (err) {
    if (err) throw err;
    console.log('File is created successfully.');
  });
}