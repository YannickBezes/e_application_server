import request from 'request'
import async_request from '../await-request'
import iconv from 'iconv-lite'
import fs from 'fs'
import { cpus } from 'os'

const CACHE = false // Activate cache

export default app => {
  app.get('/:word/definitions', (req, res) => get_def(req, res))
  app.get('/:word/:rel', (req, res) => get_word(req, res))
}

function get_word(req, res) {
  let filename = `${req.params.word}_${req.params.rel}`
  try {
    if (fs.existsSync(`cache/${filename}.json`) && CACHE) {
      fs.readFile(`cache/${filename}.json`, 'utf8', (err, data) => {
        res.send({ status: 'success', data: JSON.parse(data) })
      })
    } else {
      request.get({ encoding: null, uri: `http://www.jeuxdemots.org/rezo-dump.php?gotermsubmit=Chercher&gotermrel=${req.params.word}&rel=${req.params.rel}` }, (error, response, body) => {
        if (response.statusCode == 200) {
          // Convert ISO to utf8
          let utf8_string = iconv.decode(new Buffer(body), "ISO-8859-1")
          let data = parse_response(utf8_string)

          if (data) {
            res.json({ status: 'success', data })
            save_cache(filename, data)
          } else
            res.json({ status: 'failed', data: null, message: 'Not found' })

        } else
          res.json({ status: 'failed', data: null, message: 'Not found' })
      })
    }
  } catch (err) {
    res.json({status: 'failed', data: null, message: err})
  }
}

async function get_def(req, res) {
  let filename = `${req.params.word}_definitions`
  try {
    if (fs.existsSync(`cache/${filename}.json`) && CACHE) {
      fs.readFile(`cache/${filename}.json`, 'utf8', (err, data) => {
        res.send({ status: 'success', data: JSON.parse(data) })
      })
    } else {
      let relations = []
      // REQUEST to get refinment relations
      let data = await async_request({ encoding: null, uri: `http://www.jeuxdemots.org/rezo-dump.php?gotermsubmit=Chercher&gotermrel=${req.params.word}&rel=1` })
      relations = parse_response(data).outcoming_relations
      // REQUEST TO GET DEFINITIONS
      request.get({ encoding: null, uri: `http://www.jeuxdemots.org/rezo-dump.php?gotermsubmit=Chercher&gotermrel=${req.params.word}&rel=4` }, async (error, response, body) => {
        if (response.statusCode == 200) {
          // Convert ISO to utf8
          let utf8_string = iconv.decode(new Buffer(body), "ISO-8859-1")
          let data = parse_definitions(utf8_string)

          if (data) {
            if(data.definitions.length == 0) {
              // wait for the refinment request is finish
              if(relations.length > 0) {
                for (let i = 0; i < relations.length; i++) {
                  const rel = relations[i];
                  let rel_res = await async_request({ encoding: null, uri: `http://www.jeuxdemots.org/rezo-dump.php?gotermsubmit=Chercher&gotermrel=${rel.split(';')[1]}&rel=4` })
                  let def = parse_definitions(rel_res).definitions
                  data.definitions.push(...def)

                }
              }
            }
            res.json({ status: 'success', data })
            save_cache(filename, data)
          } else
            res.json({ status: 'failed', data: null, message: 'Not found' })

        } else
          res.json({ status: 'failed', data: null, message: 'Not found' })
      })
    }
  } catch (error) {
    console.error(error)
  }
}

function parse_response(d) {
  let str = d.substring(d.indexOf('<CODE>') + 6, d.indexOf('</CODE>'))
  if (str.trim() != '') {
    // Get the nodes types
    // let nodes_types = parse(str, 'nodes_types')

    // Get the entries
    let entries = parse(str, 'entries')
    let entries_dic = {}
    entries.forEach(el => {

      let name = el.split(';')[2].substring(1, el.split(';')[2].length - 1)
      if (/>/.test(name)) name = el.split(';')[5].substring(1, el.split(';')[5].length - 1)
      entries_dic[el.split(';')[1]] = name
    })

    // Get the relations types
    // let relations_types = parse(str, 'relation_types')

    // Get the outcoming relations
    let outcoming_relations = parse(str, 'outcomming_relations')
    outcoming_relations = parse_relations(outcoming_relations, entries_dic)
    outcoming_relations.sort((a,b) => { // Sort
      return parseInt(b.split(';')[2]) - parseInt(a.split(';')[2])
    })

    // Get the incomming relations
    let incomming_relations = parse(str, 'incomming_relations')
    incomming_relations = parse_relations(incomming_relations, entries_dic)
    incomming_relations.sort((a,b) => { // Sort
      return parseInt(b.split(';')[2]) - parseInt(a.split(';')[2])
    })

    return { outcoming_relations, incomming_relations }
  }
  return null
}

function parse(str, type) {
  let start, end, regex
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
  trash = trash.match(new RegExp(`${regex};.+\n`, 'g'))
  let clean = []
  if (trash) {
    trash.forEach(el => {
      // Clean entries (remove the entries which aren't it, remove the '\n')
      if (/\d/.test(el.split(';')[1])) clean.push(el.substring(0, el.length - 1)) // Remove the \n
    })
  }
  return clean
}

function save_cache(name, data) {
  fs.writeFile(`cache/${name}.json`, JSON.stringify(data), function (err) {
    if (err) console.error(err)
    console.log('File is created successfully.') // DEBUG
  })
}

function parse_relations(relations, entries) {
  let relations_obj = []
  relations.forEach(el => {
      relations_obj.push(`${el.split(';')[4]};${entries[el.split(';')[3]]};${el.split(';')[5]}`)
  })

  return relations_obj
}

function parse_definitions(str) {
  let def = str.substring(str.indexOf('<def>') + 5, str.indexOf('</def>')).replace(/<br \/>/g, '').replace(/\n/g, '')
  let clean_def = []
  if(def.trim() != '') {
    def = def.trim().split(/\d+\./)
    def.forEach(el => {
      let d = el.replace(/\d+\. /, '').replace(/\s{2,}/g, ' ').trim()
      if(d != '') clean_def.push(d)
    })
  } else def = []
  return {definitions: clean_def}
}
