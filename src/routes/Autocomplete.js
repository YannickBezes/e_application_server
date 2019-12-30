import fs from 'fs'

export default class Autocomplete {
  static get(req, res) {
    fs.readFile(`dict.txt`, 'utf8', (err, data) => {
      if (!err) {
        let {
          word
        } = req.params
        let words = data.split(',')

        words = words.filter((v, i) => {
          let start = word.slice(0, Math.ceil(word.length * 0.4))
          let end = word.slice(start.length)
          // User str.normalize("NFD").replace(/[\u0300-\u036f]/g, "") to remove all accents
          if (new RegExp(`^${start.normalize("NFD").replace(/[\u0300-\u036f]/g, "")}[${req.params.word}]{${end.length},}`, 'i').test(v.split(';')[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "")))
            return v
        })
        words.sort((a, b) => {
          return this.get_weight(b, word) - this.get_weight(a, word)
        })
        res.json({
          status: 'success',
          data: words.length > 10 ? words.map(el => el.split(';')[0]).splice(0, 10) : words.map(el => el.split(';')[0])
        })
      } else
        res.json({
          status: 'failed',
          data: null,
          message: err.message
        })
    })
  }

  static get_weight(node, word) {
    let n_word = node.split(';')[0]
    let n_weigth = node.split(';')[1]
    let weight = 0

    if (n_word.length === word.length) weight++
    if (n_word.length >= word.length && n_word.length <= word.length + 3) weight++

    let all = true
    let chars = [...word]
    chars.forEach(c => {
      if (!n_word.includes(c)) all = false
    })
    if (all) weight++

    weight += n_weigth
    return weight
  }
}