import iconv from 'iconv-lite'
import fs from 'fs'
import request from 'request'
import await_request from '../await-request'

const CACHE = true // Activate cache

export default class Word {

  static get_word(req, res) {
    let filename = `${req.params.word}_${req.params.rel}`
    try {
      // Check if the file is already on the cache
      if (fs.existsSync(`cache/${filename}.json`) && CACHE) {
        fs.readFile(`cache/${filename}.json`, 'utf8', (err, data) => {
          if (!err) {
            data = JSON.parse(data)
            if (req.params.limit) {
              data.incoming_relations = data.incoming_relations.slice(0, req.params.limit)
              data.outcoming_relations = data.outcoming_relations.slice(0, req.params.limit)
            }
            res.send({ status: 'success', data: data })
          }
        })
      } else {
        request.get({
          encoding: null,
          uri: `http://www.jeuxdemots.org/rezo-dump.php?gotermsubmit=Chercher&gotermrel=${req.params.word}&rel=${req.params.rel}`
        }, (error, response, body) => {
          if (!error && response.statusCode == 200) {
            // Convert ISO to utf8
            let utf8_string = iconv.decode(new Buffer(body), "ISO-8859-1")
            let data = this.parse_response(utf8_string)
            if (data) {
              let limit_data = {}
              if (req.params.limit) { // Check if there is a limit in the request
                limit_data.incoming_relations = data.incoming_relations.slice(0, req.params.limit)
                limit_data.outcoming_relations = data.outcoming_relations.slice(0, req.params.limit)
              } else {
                limit_data = data
              }
              res.json({ status: 'success', data: limit_data })

              this.save_cache(filename, data)
              this.add_weight(req.params.word)
            } else
              res.json({ status: 'failed', data: null, message: 'Not found' })

          } else
            res.json({ status: 'failed', data: null, message: 'Not found' })
        })
      }
    } catch (err) {
      res.json({ status: 'failed', data: null, message: err.toString() })
    }
  }

  static async get_def(req, res) {
    let filename = `${req.params.word}_definitions`
    try {
      // Check if the file is already on the cache
      if (fs.existsSync(`cache/${filename}.json`) && CACHE) {
        fs.readFile(`cache/${filename}.json`, 'utf8', (err, data) => {
          if (!err)
            res.send({ status: 'success', data: JSON.parse(data) })
        })
      } else {
        let relations = []
        // REQUEST to get refinment relations
        let data = await await_request({
          encoding: null,
          uri: `http://www.jeuxdemots.org/rezo-dump.php?gotermsubmit=Chercher&gotermrel=${req.params.word}&rel=1`
        })
        let parsed_data = this.parse_response(data)
        relations = parsed_data ? parsed_data.outcoming_relations : []

        // REQUEST TO GET DEFINITIONS
        request.get({
          encoding: null,
          uri: `http://www.jeuxdemots.org/rezo-dump.php?gotermsubmit=Chercher&gotermrel=${req.params.word}&rel=4`
        }, async (error, response, body) => {
          if (!error && response.statusCode == 200) {
            // Convert ISO to utf8
            let utf8_string = iconv.decode(new Buffer(body), "ISO-8859-1")
            let data = this.parse_definitions(utf8_string)

            if (data) {
              for (let i = 0; i < relations.length; i++) {
                const rel = relations[i];
                let rel_res = await await_request({
                  encoding: null,
                  uri: `http://www.jeuxdemots.org/rezo-dump.php?gotermsubmit=Chercher&gotermrel=${rel.split(';')[1]}&rel=4`
                })
                let def = this.parse_definitions(rel_res).definitions
                data.definitions.push(...def)
              }
              res.json({ status: 'success', data })
              this.save_cache(filename, data)
            } else
              res.json({ status: 'failed', data: null, message: 'Not found' })
          } else
            res.json({ status: 'failed', data: null, message: 'Not found' })
        })
      }
    } catch (error) {
      res.json({ status: 'failed', data: null, message: error.toString() })
    }
  }

  static parse_response(d) {
    let str = d.substring(d.indexOf('<CODE>') + 6, d.indexOf('</CODE>'))
    if (str.trim() != '') {
      // Get the nodes types
      // let nodes_types = parse(str, 'nodes_types')

      // Get the entries
      let entries = this.parse(str, 'entries')
      let entries_dic = {}
      entries.forEach(el => {
        let name = el.split(';')[2].substring(1, el.split(';')[2].length - 1) // Parse name
        if (/>/.test(name)) name = el.split(';')[5].substring(1, el.split(';')[5].length - 1)
        entries_dic[el.split(';')[1]] = name
      })

      // Get the relations types
      // let relations_types = parse(str, 'relation_types')

      // Get the outcoming relations
      let outcoming_relations = this.parse(str, 'outcomming_relations')
      outcoming_relations = this.parse_relations(outcoming_relations, entries_dic)
      outcoming_relations.sort((a, b) => { // Sort
        return Math.abs(parseInt(b.split(';')[2])) - Math.abs(parseInt(a.split(';')[2]))
      })

      // Get the incoming relations
      let incoming_relations = this.parse(str, 'incoming_relations')
      incoming_relations = this.parse_relations(incoming_relations, entries_dic, true)
      incoming_relations.sort((a, b) => { // Sort
        return Math.abs(parseInt(b.split(';')[2])) - Math.abs(parseInt(a.split(';')[2]))
      })

      return { outcoming_relations, incoming_relations }
    }
    return null
  }

  static parse(str, type) {
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

      case "incoming_relations":
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

  static save_cache(name, data) {
    fs.writeFile(`cache/${name}.json`, JSON.stringify(data), function (err) {
      if (err) console.error(err)
      console.log('File is created successfully.') // DEBUG - Delete this line on prod
    })
  }

  static parse_relations(relations, entries, incomming = false) {
    let relations_obj = []

    relations.forEach(el => {
      let parsed_relation = this.split_relation(el, entries)
      if (!/^_\w+/.test(parsed_relation.node_1) && !/^_\w+/.test(parsed_relation.node_2)) {  // if the word don't with "_" we can add it
        relations_obj.push(`${parsed_relation.type};${incomming ? parsed_relation.node_1: parsed_relation.node_2};${parsed_relation.weight}`)
      }
    })
    return relations_obj
  }

  static parse_definitions(str) {
    let def = str.substring(str.indexOf('<def>') + 5, str.indexOf('</def>')).replace(/<br \/>/g, '')
    let clean_def = []
    if (def.trim() != '') {
      def = def.trim().split(/\n\d{1,3}\./)
      def.forEach(el => {
        let d = el.replace(/\d{1,3}\. /, '').replace(/\s{2,}/g, ' ').trim()
        if (d != '') clean_def.push(d)
      })
    } else def = []
    return {
      definitions: clean_def
    }
  }

  static add_weight(word) {
    let buf = fs.readFileSync(`dict.txt`, 'utf8')
    let words = buf.split(',')

    words = words.map(v => {
      if (v.split(';')[0] === word)
        return `${v.split(';')[0]};${parseInt(v.split(';')[1]) + 1}`
      return v
    })

    fs.writeFile('dict.txt', words, 'utf8', err => {
      if (err)
        console.error(err)
    })
  }

  static split_relation(relation, entries) {
    let rel = {
      r: relation.split(';')[0],
      rid: relation.split(';')[1],
      node_1: entries[relation.split(';')[2]],
      node_2: entries[relation.split(';')[3]],
      type: relation.split(';')[4],
      weight: relation.split(';')[5]
    }
    if(/^=/.test(rel.node_1)) rel.node_1 = rel.node_1.slice(0, rel.node_1.length - 1)
    if(/^=/.test(rel.node_2)) rel.node_2 = rel.node_2.slice(0, rel.node_2.length - 1)

    return rel
  }
}